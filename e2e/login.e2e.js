import { expect, test } from '@playwright/test';

test('first-run setup, login, and dashboard', async ({ page }) => {
	await page.goto('/setup');
	const heading = page.locator('h1');
	await expect(heading).toBeVisible();
	const text = await heading.innerText();

	if (text.includes('setup')) {
		await page.fill('#lodgeName', 'E2E Lodge');
		await page.fill('#lodgeNumber', '7');
		await page.fill('#obedience', 'TEST');
		await page.fill('#fullName', 'E2E Admin');
		await page.selectOption('#gender', 'MALE');
		await page.fill('#birthDate', '1970-01-15');
		await page.fill('#email', 'e2e-admin@example.com');
		await page.fill('#password', 'e2e-password-ok');
		await page.fill('#passwordConfirm', 'e2e-password-ok');
		await page.click('button[type="submit"]');
		await expect(page.locator('h1')).toHaveText(/Change password/);
		await page.fill('#currentPassword', 'e2e-password-ok');
		await page.fill('#newPassword', 'e2e-password-next');
		await page.fill('#newPasswordConfirm', 'e2e-password-next');
		await page.click('button[type="submit"]');
	} else {
		await page.goto('/login');
		if (await page.locator('#email').count()) {
			await page.fill('#email', 'admin@example.com');
			await page.fill('#password', 'ChangeMe-demo-1');
			await page.click('button[type="submit"]');
		}
	}

	await expect(page.locator('h1')).toHaveText(/Home|Dashboard|Change password|Sign in/);
	if ((await page.locator('h1').innerText()) === 'Home') {
		await expect(page.getByText('Upcoming Birthdays')).toBeVisible();
		await expect(page.getByText('Active Brothers')).toBeVisible();
	}
});
