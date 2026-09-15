import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ['.monkeycode-ai.live']
	},
	ssr: {
		external: ['better-sqlite3', 'argon2']
	},
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['src/**/*.{test,spec}.js']
	}
});
