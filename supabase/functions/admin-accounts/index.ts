import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userResult, error: userError } = await authClient.auth.getUser();
  if (userError || !userResult.user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { data: actorProfile, error: actorError } = await adminClient
    .from('profiles')
    .select('id, role, is_active, is_deleted')
    .eq('id', userResult.user.id)
    .maybeSingle();

  if (actorError || !actorProfile || actorProfile.role !== 'ADMIN' || !actorProfile.is_active || actorProfile.is_deleted) {
    return json({ error: 'Forbidden' }, 403);
  }

  const payload = await request.json().catch(() => ({}));
  const action = payload.action as 'create' | 'delete' | 'deactivate' | undefined;

  if (action === 'create') {
    const email = String(payload.email ?? '').trim();
    const password = String(payload.password ?? '');
    const name = String(payload.name ?? '').trim() || email.split('@')[0];
    const role = payload.role === 'ADMIN' ? 'ADMIN' : 'SELLER';

    if (!email || !password) {
      return json({ error: 'Email and password are required.' }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        must_change_password: true,
      },
      app_metadata: {
        role,
      },
    });

    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'Unable to create auth user.' }, 400);
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      name,
      email,
      role,
      is_active: true,
      is_deleted: false,
      must_change_password: true,
    });

    if (profileError) {
      return json({ error: profileError.message }, 400);
    }

    return json({ success: true, userId: created.user.id });
  }

  if (action === 'delete' || action === 'deactivate') {
    const profileId = String(payload.profileId ?? '');
    if (!profileId) {
      return json({ error: 'profileId is required.' }, 400);
    }

    if (profileId === userResult.user.id) {
      return json({ error: 'You cannot deactivate your own account.' }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role, is_active, is_deleted')
      .eq('id', profileId)
      .maybeSingle();

    if (targetError || !target) {
      return json({ error: 'Account not found.' }, 404);
    }

    if (target.role === 'ADMIN') {
      const { count } = await adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'ADMIN').eq('is_deleted', false).eq('is_active', true);
      if ((count ?? 0) <= 1) {
        return json({ error: 'Cannot deactivate the last remaining admin.' }, 400);
      }
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ is_active: false, is_deleted: true, must_change_password: false })
      .eq('id', profileId);

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ success: true });
  }

  return json({ error: 'Unsupported action.' }, 400);
});
