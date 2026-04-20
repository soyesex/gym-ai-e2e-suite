import { faker } from '@faker-js/faker';

/** Represents a user entity for test scenarios. */
export type TestUser = {
    /** Assigned by Supabase after creation — never set manually in builders. */
    id?: string,
    email: string,
    password: string,
    displayName: string,
    locale: 'es' | 'en'
}

/**
 * Builds a randomized test user with unique email.
 * Uses `@gymai-test.local` domain so cleanup queries can target test data safely.
 *
 * @param overrides - Partial fields to customize; everything else stays random.
 * @returns A complete TestUser ready to be sent to Supabase auth.
 *
 * @example
 * buildUser()                        // fully random, locale "es"
 * buildUser({ locale: 'en' })        // random but English
 * buildUser({ email: 'fixed@x.co' }) // fixed email, rest random
 */
export function buildUser(overrides: Partial<TestUser> = {}): TestUser {
    const uuid = faker.string.uuid();
    return {
        email: `test-${uuid}@gymai-test.local`,
        password: faker.internet.password({ length: 16 }),
        displayName: faker.person.firstName(),
        locale: 'es',
        ...overrides
    };
}