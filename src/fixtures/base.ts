import { test as base, expect  } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config/env';
import { buildUser, TestUser } from '../builders/user.builder'

type Fixtures = {
    supabaseAdmin: SupabaseClient,
    testUser: TestUser,
}

export const test = base.extend<Fixtures>({
    /**
    * Supabase admin client using service_role key.
    * Bypasses RLS — use only for setup/teardown, never in assertions.
    */

    // eslint-disable-next-line no-empty-pattern
    supabaseAdmin: async ({}, use) => {
        const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        await use(client);
    },

    /**
    * Creates a fresh Supabase user for each test, tears it down after.
    * The returned TestUser includes the real `id` assigned by Supabase.
    */
    testUser: async ({ supabaseAdmin }, use) => {
        const user = buildUser();
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
        });
        if (error) throw error;

        await use({ ...user, id: data.user.id });

        // Teardown — remove the test user so tests stay isolated
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    }
});

export { expect };