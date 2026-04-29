import { test, expect } from '@/fixtures/base'

import { LoginPage } from '@/pages/auth/login.page'

test.describe('Login flow', () => { 
    test('loads the login page', async ({ page }) => {
        const login = new LoginPage(page);
        await login.goto();
        await expect(login.emailInput).toBeVisible();
        await expect(login.submitButton).toBeVisible();
    });

    test('redirects to onboarding after first login', async ({ page, testUser }) => {
        const login = new LoginPage(page);
        await login.goto();
        await login.login(testUser.email, testUser.password);
        await expect(page).toHaveURL(/onboarding/, { timeout: 15000 });
    });
});