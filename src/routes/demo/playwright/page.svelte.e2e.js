import { expect, test } from '@playwright/test';

test('demo playwright route is not part of LodgeCal e2e', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});
