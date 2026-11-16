import { expect, test } from '@playwright/test';

test('first-run setup, login, upcoming birthdays, family, brothers, and admin', async ({ page }) => {
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
			await page.fill('#email', 'e2e-admin@example.com');
			await page.fill('#password', 'e2e-password-next');
			await page.click('button[type="submit"]');
		}
		if (await page.locator('#email').count()) {
			await page.fill('#email', 'admin@example.com');
			await page.fill('#password', 'ChangeMe-demo-1');
			await page.click('button[type="submit"]');
		}
	}

	await expect(page.locator('h1')).toHaveText(/Upcoming birthdays/);
	await expect(page.getByRole('heading', { name: 'Lodge events' })).toBeVisible();

	// Look-ahead switcher on dashboard
	const sixWeeksBtn = page.getByRole('group', { name: 'Weeks ahead' }).getByRole('button', { name: '6' });
	await sixWeeksBtn.click();
	await expect(sixWeeksBtn).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.page-lead')).toContainText('Showing the next 6 weeks');

	// Navigate to My family
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My family' }).click();
	await expect(page.locator('h1')).toHaveText('My family');
	await expect(page.getByText('Notes for the birthday card').first()).toBeVisible();

	// Navigate to Brothers directory
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Brothers' }).click();
	await expect(page.locator('h1')).toHaveText('Brothers');
	await expect(page.getByText('Include sleeping brothers')).toBeVisible();

	// Navigate to Admin
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
	await expect(page.locator('h1')).toHaveText('Lodge administration');

	const email = `e2e-user-${Date.now()}@example.com`;
	const originalName = 'E2E Managed User';
	const updatedName = 'E2E Updated User';

	await page.getByRole('button', { name: 'New brother' }).click();
	await page.fill('#nb-name', originalName);
	await page.fill('#nb-email', email);
	await page.fill('#nb-birth', '1980-04-12');
	await page.getByRole('button', { name: 'Create brother' }).click();
	await expect(page.locator('.generated-password')).toContainText(email);

	let brotherBlock = page.locator('.admin-brother-block').filter({ hasText: email });
	await expect(brotherBlock).toBeVisible();

	// Edit brother
	await brotherBlock.getByRole('button', { name: 'Edit' }).click();
	await brotherBlock.getByLabel('Full name').fill(updatedName);
	await brotherBlock.getByLabel('Role').selectOption('ADMIN');
	await brotherBlock.getByRole('button', { name: 'Save brother' }).click();
	brotherBlock = page.locator('.admin-brother-block').filter({ hasText: email });
	await expect(brotherBlock).toContainText('Superadmin');

	// Mark sleeping and Reactivate
	await brotherBlock.getByRole('button', { name: 'Mark sleeping' }).click();
	await expect(brotherBlock).toContainText('Sleeping');
	await brotherBlock.getByRole('button', { name: 'Reactivate' }).click();
	await expect(brotherBlock.getByRole('button', { name: 'Mark sleeping' })).toBeVisible();

	// Delete brother
	await brotherBlock.getByRole('button', { name: 'Delete' }).click();
	await brotherBlock.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(brotherBlock).toHaveCount(0);
});
