import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js'
import { env } from '../../gym-ai-e2e-suite/src/config/env';
import { buildUser } from '../../gym-ai-e2e-suite/src/builders/user.builder'
import { loginAndSaveState } from '../../gym-ai-e2e-suite/src/helpers/auth.helper';
import path from 'path';

setup('create authenticated state', async () => {
  const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const user = buildUser();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });
  if (error) throw new Error(`Setup user creation failed: ${error.message}`);

  await loginAndSaveState(
    user.email,
    user.password,
    path.resolve('playwright/.auth/user.json')
  );
});