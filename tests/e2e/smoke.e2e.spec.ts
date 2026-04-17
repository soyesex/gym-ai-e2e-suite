import { test, expect } from '@playwright/test'

test('landing page renders hero and login link', async ({ page}) => {
    await page.goto('/');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('GYM');

    const loginLink = page.getByRole('link', { name: /log in|iniciar sesión/i});
    await expect(loginLink).toBeVisible();
})