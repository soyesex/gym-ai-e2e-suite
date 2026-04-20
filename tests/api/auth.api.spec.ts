import { test, expect } from '../../src/fixtures/base';

test.describe('Auth API', () => {
    test('signs up a new user via Supabase Auth', async ({ testUser }) => {
        expect(testUser.id).toBeDefined();
        expect(typeof testUser.id).toBe('string');
        expect(testUser.email).toContain('@gymai-test.local');
    });

    test('logs in with valid credentials and receives a session', async ({ testUser, supabaseAdmin }) => {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({ 
            email: testUser.email,
            password: testUser.password
        });

        expect(error).toBeNull();
        expect(data.session).not.toBeNull();
        expect(data.session?.access_token).toBeDefined();
    });
});
