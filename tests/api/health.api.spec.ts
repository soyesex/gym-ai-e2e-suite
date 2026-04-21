import { test, expect } from '../../src/fixtures/base';

test.describe('API health check', () => {
    test('GET / returns 200', async ({ request }) => {
        const response = await request.get('/');
        expect(response.status()).toBe(200);
    })
})