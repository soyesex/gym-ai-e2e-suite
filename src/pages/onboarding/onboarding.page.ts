import { BasePage } from "../base.page";
import { Locator } from '@playwright/test';

export class OnboardingPage extends BasePage {
    readonly url = '/onboarding';

    get nameInput(): Locator {
        return this.page.locator('#onboarding-name');
    }

    get nextButton(): Locator { 
        return this.page.getByRole('button', { name: /^Siguiente$|^Next$/i });
    }

    get finishButton(): Locator { 
        return this.page.getByRole('button', { name: /^Inicializar Protocolo$|Initialize Protocol/i });
    }

    async goto(): Promise<void> {
        await this.page.goto(this.url);
    }

    async clickNext() {
        await this.nextButton.click();
    }

    async clickFinish() {
        await this.finishButton.click();
    }

    // Step 1 - Nombre
    async fillName(name: string) {
        await this.nameInput.fill(name);
    }

    // Step 2 - Objetivos (multi-select)
    async selectGoal(goal: string) {
        await this.page.getByRole('button', { name: goal }).click();
    }

    // Step 3 - Nivel
    async selectLevel(level: string) {
        await this.page.getByRole('button', { name: level }).click();
    }
    // Step 4 - Equipamiento
    async selectEquipment(equip: string) {
        await this.page.getByRole('button', { name: equip }).click();
    }

    /**
     * Clicks on a Radix slider track at the position for the desired value.
     * 
     * Uses index-based selection because each step shows exactly 2 sliders
     * in a known order. The track (.bg-muted) gives us the full clickable
     * width, while the thumb (role="slider") gives us aria-valuemin/max.
     */
    private async setSliderByIndex(index: number, value: number) {
        const slider = this.page.getByRole('slider').nth(index);
        await slider.waitFor({ state: 'visible' });

        const min = Number(await slider.getAttribute('aria-valuemin'));
        const max = Number(await slider.getAttribute('aria-valuemax'));

        // Click on the track (full-width bar), not the thumb (small circle)
        const track = this.page.locator('.bg-muted').nth(index);
        const box = await track.boundingBox();
        if (!box) throw new Error(`Slider track ${index} not visible`);

        const percentage = (value - min) / (max - min);
        const x = box.x + box.width * percentage;
        const y = box.y + box.height / 2;

        await this.page.mouse.click(x, y);
    }

    // Step 5 — first slider is weight, second is height
    async setWeight(value: number) {
        await this.setSliderByIndex(0, value);
    }
    async setHeight(value: number) {
        await this.setSliderByIndex(1, value);
    }

    // Step 6 — first slider is days, second is minutes
    async setDaysPerWeek(value: number) {
        await this.setSliderByIndex(0, value);
    }
    async setMinutesPerSession(value: number) {
        await this.setSliderByIndex(1, value);
    }

    async clickEnterDashboard() {
        await this.page.getByRole('button', { name: /Entrar|Enter/i }).click();
    }
}