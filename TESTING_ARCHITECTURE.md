# TESTING ARCHITECTURE — Suite de Automatización E2E

> **Documento maestro.** Esta es la fuente de verdad sobre cómo se escriben, organizan y ejecutan las pruebas automatizadas del proyecto. Todo LLM o desarrollador que genere tests debe leer y respetar este archivo antes de escribir código.

**Stack objetivo:** Playwright + TypeScript (strict) · Next.js 15 (App Router) · Supabase local (Docker) · pgvector · Gemini 2.5 Flash · GitHub Actions.

**Propósito del repo:** suite de portafolio defendible en entrevistas + suite real contra la app GYM-AI.

---

## 0. Principios no negociables

Estas reglas aplican a **todos** los tests. Si una regla entra en conflicto con otra cosa, esta sección gana.

1. **Tests independientes.** Un test nunca depende del orden de ejecución ni del estado que dejó otro test. Cualquier test debe poder correrse aislado con `npx playwright test path/al/test.spec.ts`.
2. **Sin `waitForTimeout`.** Nunca. Se usa siempre web-first assertions (`expect(locator).toBeVisible()`, `.toHaveText()`, etc.), que reintentan automáticamente hasta el timeout.
3. **Sin selectores frágiles.** Prohibido CSS acoplado al markup (`.MuiButton-root > span:nth-child(2)`) y XPath. Orden de preferencia: `getByRole` → `getByLabel` / `getByPlaceholder` → `getByTestId` → `getByText`. El `data-testid` se agrega en el componente, no se improvisa.
4. **Autenticación por API, nunca por UI** (excepto el test explícito del login).
5. **Datos únicos por test.** UUID / Faker en cada entidad creada. Cero data estática compartida entre tests.
6. **Fixtures, no `beforeEach` con estado mutable.** Todo recurso (page objects, clientes, usuarios) se inyecta por fixture.
7. **Cada test hace una sola afirmación conceptual.** Puede tener varios `expect`, pero todos verifican el mismo comportamiento.
8. **Cero `console.log` en tests que llegan a `main`.** Se usa el reporter de Playwright y el Trace Viewer.
9. **Todo test E2E es bilingüe-aware.** La app tiene i18n (EN/ES). Los asserts nunca dependen del idioma a menos que el test sea explícitamente de i18n.
10. **Si un test es `.skip` o `.fixme` por más de 7 días, se borra.** No hay zombies.

---

## 1. Estrategia de capas (Testing Pyramid)

No todo se testea por UI. Cada tipo de validación tiene su capa.

| Capa                       | Herramienta                            | Qué va aquí                                                                                                                  | Qué NO va aquí                                                 |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Unit**                   | Vitest (fuera de este repo, en la app) | Lógica pura, utilidades, hooks sin side effects                                                                              | Nada que toque DB, red o navegador                             |
| **API / Integration**      | `request` fixture de Playwright        | Endpoints de Next.js (Route Handlers, Server Actions expuestas), validación de schema (Zod), códigos de estado, efecto en DB | Validaciones de UI, CSS                                        |
| **E2E UI crítico**         | Playwright (browser)                   | Flujos de usuario core: onboarding, login, crear plan, iniciar sesión de entrenamiento, completar workout                    | Casos borde de validación de formulario (eso va en unit o API) |
| **Visual / Accesibilidad** | Playwright + `@axe-core/playwright`    | Smoke visual, contraste, roles ARIA en pantallas clave                                                                       | Regresión pixel-perfect de toda la app                         |
| **RAG / IA**               | Playwright API + golden datasets       | Retrieval determinista, calidad de generación semántica                                                                      | Asserts exactos de texto del LLM                               |

**Regla del 70/20/10:** apunta a 70% API, 20% E2E UI, 10% visual/IA. La suite E2E UI es la más lenta y frágil; se reserva para flujos de negocio que **solo** se pueden validar integrados.

---

## 2. Estructura de carpetas

```tree
/
├── .github/workflows/
│   └── e2e.yml
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── supabase/                          # CLI de Supabase (migrations + seed)
│   ├── migrations/
│   ├── seed.sql                       # Datos base (catálogos, ejercicios)
│   └── config.toml
├── src/
│   ├── config/
│   │   └── env.ts                     # Validación de env vars con Zod
│   ├── fixtures/
│   │   ├── base.ts                    # export const test = base.extend(...)
│   │   ├── auth.fixture.ts            # Usuarios autenticados (storageState)
│   │   ├── supabase.fixture.ts        # Cliente admin con service_role
│   │   ├── api.fixture.ts             # APIRequestContext tipado
│   │   └── data-builders.fixture.ts   # Factories (userBuilder, planBuilder)
│   ├── pages/                         # Page Objects
│   │   ├── base.page.ts
│   │   ├── auth/
│   │   │   ├── login.page.ts
│   │   │   └── signup.page.ts
│   │   ├── onboarding/
│   │   ├── workout/
│   │   │   ├── plan.page.ts
│   │   │   └── session.page.ts
│   │   └── stats/
│   ├── builders/                      # Data factories puras (sin Playwright)
│   │   ├── user.builder.ts
│   │   ├── plan.builder.ts
│   │   └── exercise.builder.ts
│   ├── helpers/
│   │   ├── auth.helper.ts             # login vía API, genera storageState
│   │   ├── db.helper.ts               # cleanup selectivo, seeders ad-hoc
│   │   ├── i18n.helper.ts             # resolver de strings por locale
│   │   └── ai/
│   │       ├── llm-judge.ts           # LLM-as-a-judge (Gemini Flash)
│   │       ├── retrieval-asserts.ts   # asserts deterministas de pgvector
│   │       └── semantic.ts            # asserts suaves (contains, length)
│   └── types/
│       └── test-data.ts
├── tests/
│   ├── api/                           # Capa API (rápida, mucha cobertura)
│   │   ├── auth.api.spec.ts
│   │   ├── workout-plan.api.spec.ts
│   │   └── rag-retrieval.api.spec.ts
│   ├── e2e/                           # Flujos UI críticos
│   │   ├── onboarding.e2e.spec.ts
│   │   ├── create-plan.e2e.spec.ts
│   │   └── live-session.e2e.spec.ts
│   ├── visual/
│   │   └── a11y.spec.ts
│   ├── ai/
│   │   ├── retrieval.spec.ts          # determinista
│   │   ├── generation.spec.ts         # semantic + LLM-judge
│   │   └── golden-datasets/
│   │       ├── retrieval.json
│   │       └── generation.json
│   └── global.setup.ts                # Reset DB + login + storageState
├── test-results/                      # gitignored
└── playwright-report/                 # gitignored
```

**Regla:** nunca se importa código de la app (`../src/app/...`) desde los tests. El repo de tests es **independiente** — golpea la app como cualquier cliente externo, por HTTP o por UI. Esto es lo que lo hace defendible en entrevista.

---

## 3. Convenciones de nombres

| Elemento            | Convención                             | Ejemplo                                        |
| ------------------- | -------------------------------------- | ---------------------------------------------- |
| Archivo de test API | `*.api.spec.ts`                        | `workout-plan.api.spec.ts`                     |
| Archivo de test E2E | `*.e2e.spec.ts`                        | `onboarding.e2e.spec.ts`                       |
| Page Object         | `*.page.ts`, clase `PascalCasePage`    | `login.page.ts` → `LoginPage`                  |
| Fixture             | `*.fixture.ts`, export `test`          | —                                              |
| Builder             | `*.builder.ts`, factory fn `buildX()`  | `buildUser()`                                  |
| Helper              | `*.helper.ts`, funciones nombradas     | —                                              |
| Test id en UI       | `data-testid="feature-element-action"` | `data-testid="plan-card-delete"`               |
| Suite describe      | verbo en inglés, presente              | `test.describe('creates a workout plan', ...)` |
| Test individual     | inglés, escenario claro                | `test('rejects plan without exercises', ...)`  |

---

## 4. Playwright Fixtures (patrón base)

Todas las fixtures se componen en `src/fixtures/base.ts`. Los tests **nunca** importan de `@playwright/test` directo; importan de `src/fixtures/base.ts`.

```ts
// src/fixtures/base.ts
import { test as base, expect } from "@playwright/test";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LoginPage } from "../pages/auth/login.page";
import { PlanPage } from "../pages/workout/plan.page";
import { env } from "../config/env";
import { buildUser, TestUser } from "../builders/user.builder";

type Fixtures = {
  supabaseAdmin: SupabaseClient;
  loginPage: LoginPage;
  planPage: PlanPage;
  testUser: TestUser;
};

export const test = base.extend<Fixtures>({
  supabaseAdmin: async ({}, use) => {
    const client = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      },
    );
    await use(client);
  },

  testUser: async ({ supabaseAdmin }, use) => {
    const user = buildUser();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (error) throw error;
    await use({ ...user, id: data.user.id });
    // cleanup
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  planPage: async ({ page }, use) => {
    await use(new PlanPage(page));
  },
});

export { expect };
```

**Reglas de fixtures:**

- Una fixture **siempre** hace teardown de lo que crea (patrón `await use(x); cleanup()`).
- Si el setup es caro y se puede compartir entre tests del mismo worker, se marca como `{ scope: 'worker' }`.
- Una fixture nunca lanza `throw` silencioso. Si algo falla en el setup, se lanza con mensaje claro.

---

## 5. Autenticación — storageState

**Nunca** se hace login por UI excepto en el test `auth/login.e2e.spec.ts`.

**Flujo:**

1. `tests/global.setup.ts` hace login vía API para N perfiles (free user, pro user, onboarded, fresh) y guarda en `playwright/.auth/<perfil>.json`.
2. Cada test declara qué perfil necesita con `test.use({ storageState: 'playwright/.auth/pro.json' })`.
3. Los perfiles se recrean en cada run de CI (no se cachean — la BD se resetea).

```ts
// playwright.config.ts (fragmento)
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/ },
  {
    name: 'e2e-authenticated',
    dependencies: ['setup'],
    use: { storageState: 'playwright/.auth/pro.json' },
  },
  {
    name: 'e2e-anon',
    dependencies: ['setup'],
  },
],
```

---

## 6. Data Builders

Zero datos estáticos. Toda entidad se construye con un builder.

```ts
// src/builders/user.builder.ts
import { faker } from "@faker-js/faker";

export type TestUser = {
  id?: string;
  email: string;
  password: string;
  displayName: string;
  locale: "en" | "es";
};

export function buildUser(overrides: Partial<TestUser> = {}): TestUser {
  const uuid = faker.string.uuid();
  return {
    email: `test-${uuid}@gymai-test.local`,
    password: faker.internet.password({ length: 16 }),
    displayName: faker.person.firstName(),
    locale: "es",
    ...overrides,
  };
}
```

**Reglas:**

- Todo builder acepta `overrides` para que el test pueda afinar solo lo que importa.
- El email siempre incluye un marcador (`gymai-test.local`) para que el cleanup masivo pueda filtrarlo sin riesgo.
- Prohibido hardcodear emails reales o passwords "conocidos" como `Test1234!`.

---

## 7. Estrategia de base de datos

### 7.1 Setup global (una vez por run)

```bash
supabase db reset --local   # aplica migrations + seed.sql
```

Esto corre en `global.setup.ts` **una sola vez** antes de que arranquen los tests. No se resetea entre tests — sería demasiado lento para paralelización.

### 7.2 Aislamiento entre tests

Cada test:

1. Crea sus propias entidades con UUIDs únicos (via builders + `service_role`).
2. Interactúa **solo** con sus UUIDs.
3. Limpia lo que creó en el teardown de la fixture.

### 7.3 Seed.sql

Contiene solo datos **inmutables** que la app necesita para funcionar: catálogo de ejercicios base, tipos de equipamiento, etc. **Nunca** usuarios de prueba — esos los crean los tests.

### 7.4 Service role key

Se usa **solo** en fixtures de setup/teardown para saltarse RLS y sembrar estado. **Nunca** en un assertion. Si un test necesita verificar que RLS funciona, debe usar un cliente con `anon` key o JWT de usuario.

---

## 8. Testing de API (Next.js endpoints)

Se usa `request` fixture de Playwright — no Supertest ni Axios.

```ts
test("POST /api/plans creates a plan and persists in DB", async ({
  request,
  supabaseAdmin,
  testUser,
}) => {
  const response = await request.post("/api/plans", {
    data: { name: "Push/Pull/Legs", days: 6 },
    headers: { Authorization: `Bearer ${testUser.accessToken}` },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({
    id: expect.any(String),
    name: "Push/Pull/Legs",
  });

  // Caja blanca: verifica en DB
  const { data } = await supabaseAdmin
    .from("workout_plans")
    .select("*")
    .eq("id", body.id)
    .single();
  expect(data).not.toBeNull();
  expect(data.user_id).toBe(testUser.id);
});
```

**Validación de contratos:** cada response de API se valida con un schema Zod en `src/schemas/`. Si el schema falla, el test falla aunque el status sea 200.

```ts
import { PlanSchema } from "../../src/schemas/plan.schema";
const body = PlanSchema.parse(await response.json()); // throw si el contrato cambió
```

---

## 9. Page Object Model — reglas estrictas

```ts
// src/pages/workout/plan.page.ts
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../base.page";

export class PlanPage extends BasePage {
  readonly url = "/app/plan";

  // locators como getters, nunca como strings sueltos
  get createButton(): Locator {
    return this.page.getByRole("button", { name: /create plan|crear plan/i });
  }
  get planCards(): Locator {
    return this.page.getByTestId("plan-card");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async createPlan(name: string): Promise<void> {
    await this.createButton.click();
    await this.page.getByLabel(/name|nombre/i).fill(name);
    await this.page.getByRole("button", { name: /save|guardar/i }).click();
    await expect(this.planCards.filter({ hasText: name })).toBeVisible();
  }
}
```

**Reglas:**

- Los POs tienen **métodos que describen intención del usuario** (`createPlan`), no acciones mecánicas (`clickButton3`).
- Los locators son **getters** (lazy) — nunca propiedades evaluadas en el constructor, porque eso rompe con SPA y navegación.
- El PO **nunca** hace asserts de negocio. Los asserts viven en el test. El PO sí puede tener asserts de **precondición** (ej: "la página cargó") dentro de `goto()`.
- Prohibido usar `page.waitForSelector`, `page.waitForTimeout` dentro de un PO. Siempre `expect(locator).toBeVisible()` implícito vía la siguiente acción.

---

## 10. Selectores — orden de prioridad

1. **`getByRole`** — el estándar. Obliga a que la UI sea accesible.
2. **`getByLabel` / `getByPlaceholder`** — para inputs.
3. **`getByText`** — solo para contenido estable (títulos de sección fijos). Peligroso con i18n.
4. **`getByTestId`** — cuando nada de lo anterior es viable (ej: elementos sin rol semántico, cards genéricas). Se agrega `data-testid` en el código de la app.
5. **CSS específico** — último recurso, solo si es un atributo estable (`[data-state="open"]`).

**Prohibido:** `nth-child`, XPath, selectores con clases de Tailwind o CSS modules.

**i18n:** cuando el texto puede estar en EN o ES, se usa regex case-insensitive: `{ name: /save|guardar/i }`.

---

## 11. Testing de IA (RAG + generación)

### 11.1 Dividir retrieval y generation

**Retrieval (determinista):** dado un query conocido, el pipeline de pgvector debe devolver los mismos chunks (por ID). Esto SÍ se puede afirmar exacto.

```ts
test("retrieval returns expected exercise chunks for bench press query", async ({
  request,
}) => {
  const res = await request.post("/api/rag/search", {
    data: { query: "press banca ejercicio pecho" },
  });
  const { chunks } = await res.json();
  const ids = chunks.map((c) => c.id);
  // IDs definidos en golden dataset — no textos
  expect(ids).toEqual(
    expect.arrayContaining(["ex-bench-press-01", "ex-bench-press-02"]),
  );
  expect(ids.length).toBeLessThanOrEqual(5);
});
```

### 11.2 Generation — asserts semánticos, nunca exactos

```ts
test("plan generation returns coherent Spanish response", async ({
  request,
  testUser,
}) => {
  const res = await request.post("/api/plans/generate", {
    data: { goal: "hipertrofia", daysPerWeek: 4 },
    headers: { Authorization: `Bearer ${testUser.accessToken}` },
  });
  const { plan, summary } = await res.json();

  // Estructura
  expect(plan.days).toHaveLength(4);
  expect(plan.days.every((d) => d.exercises.length > 0)).toBe(true);

  // Lenguaje
  expect(summary.length).toBeGreaterThan(50);
  expect(summary).toMatch(/hipertrofia|músculo|volumen/i);
});
```

### 11.3 LLM-as-a-judge (para features críticas)

Se usa **solo** en tests marcados como `@ai-judge` y que corren en un job separado de CI (nightly, no en cada PR). Razón: consume cuota de Gemini Free Tier.

```ts
// src/helpers/ai/llm-judge.ts
export async function judge(criteria: string, response: string): Promise<{ pass: boolean; reason: string }> {
  const prompt = `Evaluate strictly. Return ONLY JSON {"pass": boolean, "reason": string}.
  Criteria: ${criteria}
  Response to evaluate: """${response}"""`;
  // ...llamada a Gemini Flash...
}

// uso en test
test('@ai-judge plan summary is encouraging and in Spanish', async ({ request }) => {
  const summary = /* ... obtener summary ... */;
  const verdict = await judge(
    'Is the text in Spanish AND uses an encouraging, motivational tone?',
    summary
  );
  expect(verdict.pass, verdict.reason).toBe(true);
});
```

**Reglas del juez:**

- Prompt del juez es una constante versionada — cambios requieren PR.
- Criterios binarios (pass/fail), no escalas 1-10 (menos ruidoso).
- Siempre se incluye `reason` en el `expect` para que el reporte muestre el porqué del fallo.

### 11.4 Mocking de IA para tests de UI

Para tests E2E de UI donde la IA no es el foco, se **mockea** la respuesta con `page.route`:

```ts
await page.route("**/api/plans/generate", (route) =>
  route.fulfill({ status: 200, json: FIXTURE_PLAN_RESPONSE }),
);
```

Esto:

- Ahorra cuota de Gemini.
- Hace el test 100x más rápido.
- Elimina el no-determinismo del LLM cuando no es lo que se está probando.

**Regla:** solo **un** (1) test E2E end-to-end real golpea Gemini de verdad. Ese test vive en `tests/e2e/smoke-ai.spec.ts` y se marca con `@smoke`.

### 11.5 Golden datasets

Los tests de retrieval/generation comparan contra datasets versionados en `tests/ai/golden-datasets/`. Cambiar el dataset **requiere PR explícito** con justificación (cambió el corpus, cambió el modelo, etc.).

---

## 12. Configuración de Playwright (referencia)

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined, // Supabase local tiene límite de conexiones
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["github"], // anotaciones nativas en GH Actions
  ],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-ES",
    timezoneId: "America/Bogota",
  },
  expect: { timeout: 10_000 },
  timeout: 60_000,
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    { name: "api", testDir: "./tests/api", dependencies: ["setup"] },
    {
      name: "e2e-chrome",
      testDir: "./tests/e2e",
      dependencies: ["setup"],
      use: devices["Desktop Chrome"],
    },
    { name: "ai", testDir: "./tests/ai", dependencies: ["setup"] },
  ],
});
```

**Claves:**

- `trace: 'retain-on-failure'` — traza completa disponible en el artefacto cuando algo falla. Crítico para debuggear CI.
- `workers: 2` en CI — más workers saturan el pool de conexiones de Supabase local.
- `forbidOnly: true` en CI — fail si alguien dejó un `.only`.

---

## 13. GitHub Actions — pipeline

```yaml
name: E2E Tests
on:
  pull_request:
  push: { branches: [main] }

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4] # sharding cuando la suite crezca
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "npm" }

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: Start Supabase
        run: supabase start

      - name: Build & start Next.js
        run: |
          npm run build --prefix ../gym-ai
          npm run start --prefix ../gym-ai &
          npx wait-on http://localhost:3000
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.LOCAL_ANON_KEY }}

      - name: Run Playwright
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.LOCAL_SERVICE_ROLE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 14

  merge-reports:
    if: always()
    needs: e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { path: all-reports, pattern: playwright-report-* }
      - run: npx playwright merge-reports ./all-reports --reporter=html
      - uses: actions/upload-artifact@v4
        with: { name: html-report--final, path: playwright-report/ }
```

**Jobs separados:**

- `e2e` (PR + main) — api + e2e-chrome con mocks de IA.
- `ai-nightly` (cron) — tests con `@ai-judge` reales contra Gemini. Una vez al día.

---

## 14. Manejo de flakiness

1. **Detección:** antes de mergear un test nuevo, se corre `npx playwright test <archivo> --repeat-each=10`. Si falla alguna, no entra.
2. **Cuarentena:** test intermitente en `main` se mueve a `tests/quarantine/` y se crea issue. No bloquea CI pero se monitorea.
3. **Retries:** `retries: 2` en CI. Si un test necesita retries crónicos, es flaky — no está "tolerado".
4. **Reporte:** cada semana se revisa qué tests reintentaron más del 5% de las veces. Se arreglan o se borran.

---

## 15. Secretos y variables de entorno

Toda variable se declara y valida en `src/config/env.ts` con Zod. El test falla al arrancar si falta alguna.

```ts
import { z } from "zod";
const EnvSchema = z.object({
  BASE_URL: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(), // opcional: solo tests con judge
});
export const env = EnvSchema.parse(process.env);
```

**Reglas:**

- `.env.test` local, **nunca** commiteado. `.env.test.example` sí.
- En CI, GitHub Secrets.
- `service_role` **nunca** aparece en logs ni traces. Si un test lo necesita loggear, se redacta.

---

## 16. Checklist para cada test nuevo

Antes de abrir PR, el test debe cumplir:

- [ ] Nombre descriptivo en inglés, verbo en presente.
- [ ] Vive en la capa correcta (api / e2e / ai / visual).
- [ ] Usa fixtures, no `beforeEach`.
- [ ] Toda entidad se crea con builder.
- [ ] Selectores por rol/label/testid (nunca CSS frágil).
- [ ] Asserts web-first (`expect(locator).toBeVisible()`, no `waitForTimeout`).
- [ ] Es independiente del orden.
- [ ] Corre aislado: `npx playwright test ruta/test.spec.ts`.
- [ ] Corre 10 veces sin fallar: `--repeat-each=10`.
- [ ] Teardown limpio (fixture hace cleanup).
- [ ] Sin `console.log`, `.only`, `.skip` sin issue asociado.
- [ ] Si toca IA, usa mock **o** está marcado con `@ai-judge`.

---

## 17. Instrucciones para el LLM que genera tests

> **Esta sección es para ti, LLM generador de tests.** Cuando se te pida un nuevo test:

1. **Primero decide la capa** (api / e2e / ai / visual). Si no está claro, pregunta. Por defecto, prefiere API sobre UI.
2. **Importa SIEMPRE** desde `src/fixtures/base.ts`:
   ```ts
   import { test, expect } from "../../src/fixtures/base";
   ```
3. **Nunca** importes `@playwright/test` directo en un archivo `*.spec.ts`.
4. **Nunca** uses `page.waitForTimeout`, `setTimeout`, `sleep`. Todo con `expect(locator).toXxx()`.
5. **Selectores:** `getByRole` > `getByLabel` > `getByTestId`. Nada de CSS ni XPath.
6. **Datos:** todo con builders en `src/builders/`. Nada hardcodeado.
7. **Page Objects:** si el flujo toca una página, usa el PO existente o crea uno nuevo siguiendo §9. No pongas locators en el test.
8. **Para tests de IA:** decide si es retrieval (determinista, assert exacto de IDs) o generation (semántico / mockeado / judge). Ver §11.
9. **Cuando crees entidades en DB**, usa el fixture `supabaseAdmin` y haz cleanup en el `afterEach` o en una fixture dedicada.
10. **Si el test cubre un flujo que no existe como PO ni builder**, primero crea el PO/builder en un archivo separado, después el test. Nunca mezcles.
11. **Describe** lo que el test hace en una línea de comentario arriba del `test(...)`, si el nombre no es suficiente.
12. **Antes de entregar**, revisa el checklist de §16.

**Formato de entrega esperado cuando generes un test:**

- Un bloque con el archivo de test.
- Si tocó PO, builder o fixture, los archivos tocados con el diff.
- Una lista de archivos afectados al final.
- Comando exacto para correr solo ese test.

---

## 18. Evolución del documento

Este documento es vivo pero conservador. Cambiar una regla de §0 requiere PR con justificación. Agregar capítulos o ejemplos es libre.

**Última revisión:** 2026-04-16.
