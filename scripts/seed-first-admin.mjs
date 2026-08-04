import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const identifier = process.env.INITIAL_ADMIN_EMAIL;
const email = identifier.toLowerCase().includes('@') ? identifier.toLowerCase() : `${identifier.toLowerCase()}@manay.local`;
const password = process.env.INITIAL_ADMIN_PASSWORD;
const name = process.env.INITIAL_ADMIN_NAME ?? 'First Admin';

const { data: existingAdmins, error: existingError } = await supabase
  .from('profiles')
  .select('id')
  .eq('role', 'ADMIN')
  .eq('is_deleted', false)
  .limit(1);

if (existingError) {
  throw existingError;
}

if (existingAdmins?.length) {
  console.log('An admin profile already exists. Seed skipped.');
  process.exit(0);
}

const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    name,
    must_change_password: true,
  },
  app_metadata: {
    role: 'ADMIN',
  },
});

if (createUserError) {
  throw createUserError;
}

const user = userData.user;
if (!user) {
  throw new Error('Failed to create the initial admin user.');
}

const { error: profileError } = await supabase.from('profiles').upsert(
  {
    id: user.id,
    name,
    email,
    role: 'ADMIN',
    is_active: true,
    is_deleted: false,
    must_change_password: true,
  },
  { onConflict: 'id' },
);

if (profileError) {
  throw profileError;
}

console.log(`Seeded first admin: ${email}`);
