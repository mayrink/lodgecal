import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'LODGECAL_DATABASE_PATH=data/e2e.sqlite npm run build && LODGECAL_DATABASE_PATH=data/e2e.sqlite npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	},
	testDir: 'e2e',
	testMatch: '**/*.e2e.js',
	use: {
		baseURL: 'http://127.0.0.1:4173'
	}
});
