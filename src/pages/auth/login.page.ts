import { BasePage } from "../base.page";
import { Locator } from '@playwright/test';
import { expect } from '@/fixtures/base';

export class LoginPage extends BasePage {
    readonly url = '/login';

    get emailInput(): Locator {
        return this.page.getByRole('textbox', { name: /correo electrónico|email/i });
    }
    get passwordInput(): Locator { 
        return this.page.getByRole('textbox', { name: /contraseña|password/i });
    }
    get submitButton(): Locator { 
        return this.page.getByRole('button', { name: /acceder al sistema|log in/i });
    }
    
    async login(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    async goto(): Promise<void> {
        await this.page.goto(this.url);
        await expect(this.submitButton).toBeVisible();
    }
}   