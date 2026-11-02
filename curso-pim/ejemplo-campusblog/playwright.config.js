import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:3100',
        trace: 'on-first-retry',
        // En máquinas con el navegador ya instalado en otra ruta: PW_CHROMIUM=/ruta/al/chromium
        launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    },
    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
        { name: 'movil', use: { ...devices['Pixel 7'] } },
    ],
    webServer: {
        command: 'SEED=1 PORT=3100 node --no-warnings src/server.js',
        url: 'http://localhost:3100/api/health',
        reuseExistingServer: !process.env.CI,
    },
});
