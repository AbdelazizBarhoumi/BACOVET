import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/Browser',
    fullyParallel: false,
    workers: 1,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: process.env.CI ? 'line' : 'list',
    use: {
        baseURL: process.env.V5_BASE_URL ?? 'http://127.0.0.1:8002',
        storageState: process.env.V5_STORAGE_STATE || undefined,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        ...devices['Desktop Chrome'],
    },
});
