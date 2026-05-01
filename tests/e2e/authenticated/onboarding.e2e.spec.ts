import { test, expect } from '@/fixtures/base';
import { OnboardingPage } from '@/pages/onboarding/onboarding.page'

test.describe('Onboarding flow', () => {
    test('completes full onboarding wizard and redirects to dashboard', async ({ page, testUser }) => {
        const onboardingPage = new OnboardingPage(page);
        await onboardingPage.goto();
        await onboardingPage.fillName(testUser.displayName);
        await onboardingPage.clickNext();
        await onboardingPage.selectGoal('Perder  Grasa');
        await onboardingPage.clickNext();
        await onboardingPage.selectLevel('Principiante')
        await onboardingPage.clickNext();
        await onboardingPage.selectEquipment('Gym Completo');
        await onboardingPage.clickNext();
        await onboardingPage.setWeight(75);
        await onboardingPage.setHeight(175);
        await onboardingPage.clickNext();
        await onboardingPage.clickFinish();
        await onboardingPage.clickEnterDashboard();
        await expect(page).toHaveURL(/dashboard/);
    });
}) 