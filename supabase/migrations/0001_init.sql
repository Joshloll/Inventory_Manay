create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN', 'SELLER');
create type public.transaction_type as enum ('SALE', 'RESTOCK', 'ADJUSTMENT', 'REMOVAL');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null,
  email text not null unique,
  role public.app_role not null default 'SELLER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  must_change_password boolean not null default false,
  last_sign_in_at timestamptz
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  reorder_threshold integer not null default 0 check (reorder_threshold >= 0),
  supplier_notes text,
  image_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  type public.transaction_type not null,
  quantity_change integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  unit_price_at_sale numeric(12,2),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists items_category_idx on public.items (category);
create index if not exists items_quantity_idx on public.items (quantity);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'ADMIN'
      and p.is_active = true
      and p.is_deleted = false
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'SELLER'),
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.adjust_inventory_transaction(
  p_item_id uuid,
  p_user_id uuid,
  p_quantity_change integer,
  p_type public.transaction_type,
  p_unit_price_at_sale numeric default null,
  p_details jsonb default '{}'::jsonb
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_before integer;
  v_after integer;
  v_transaction public.transactions;
  v_price numeric(12,2);
begin
  if p_quantity_change = 0 then
    raise exception 'Quantity change cannot be zero';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
    and is_deleted = false
  for update;

  if not found then
    raise exception 'Item not found';
  end if;

  v_before := v_item.quantity;
  v_after := v_before + p_quantity_change;

  if v_after < 0 then
    raise exception 'Insufficient stock for this sale';
  end if;

  v_price := coalesce(p_unit_price_at_sale, v_item.unit_price);

  update public.items
  set quantity = v_after,
      updated_at = now()
  where id = p_item_id;

  insert into public.transactions (
    item_id,
    user_id,
    type,
    quantity_change,
    quantity_before,
    quantity_after,
    unit_price_at_sale,
    details
  )
  values (
    p_item_id,
    p_user_id,
    p_type,
    p_quantity_change,
    v_before,
    v_after,
    case when p_type = 'SALE' then v_price else null end,
    p_details
  )
  returning * into v_transaction;

  insert into public.activity_logs (user_id, action, target_type, target_id, details)
  values (
    p_user_id,
    p_type::text,
    'ITEM',
    p_item_id,
    format('%s on %s: %s -> %s', p_type::text, v_item.name, v_before, v_after)
  );

  return v_transaction;
end;
$$;

grant execute on function public.adjust_inventory_transaction(uuid, uuid, integer, public.transaction_type, numeric, jsonb) to authenticated;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.transactions enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles read own or admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles update own or admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "items read authenticated"
on public.items
for select
to authenticated
using (true);

create policy "items write admin only"
on public.items
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "items update admin only"
on public.items
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "items delete admin only"
on public.items
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy "transactions read own or admin"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "activity logs read admin only"
on public.activity_logs
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "activity logs insert admin only"
on public.activity_logs
for insert
to authenticated
with check (public.is_admin(auth.uid()));
