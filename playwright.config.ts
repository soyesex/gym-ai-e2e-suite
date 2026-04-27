import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// 1. Le decimos a Playwright que lea nuestro archivo .env local de la suite
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],                                 
    ['html', { open: 'never' }],               
  ],
  
  use: {
    /* 2. Definimos la URL base para no tener que escribirla en cada test */
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'e2e-authenticated',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testIgnore: /login\.e2e/,
    },
    {
      name: 'e2e-anon',
      testDir: './tests/e2e',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /login\.e2e/,
    },
  ],

  /* 3. ¡AQUÍ ESTÁ LA MAGIA DEL WEBSERVER! */
  webServer: {
    // Navegamos a la carpeta de tu app real y la arrancamos
    command: 'cd ../gym-ai/gym-app && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    
    // Inyectamos las variables de entorno locales de Docker para SOBRESCRIBIR las de tu app
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    },
  },
});