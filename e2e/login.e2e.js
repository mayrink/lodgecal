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

	await expect(page.locator('h1')).toHaveText(/Home|Dashboard|Change password|Sign in/);
	if ((await page.locator('h1').innerText()) === 'Home') {
		await expect(page.getByText('Upcoming Birthdays')).toBeVisible();
		await expect(page.getByText('Active Brothers')).toBeVisible();

		await page.getByRole('button', { name: 'Collapse sidebar' }).click();
		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
		await page.goto('/people');
		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
		await page.reload();
		await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();

		const email = `e2e-user-${Date.now()}@example.com`;
		const originalName = 'E2E Managed User';
		const updatedName = 'E2E Updated User';
		await page.goto('/users');
		const addUserButton = page.getByRole('button', { name: 'Add user' });
		const addButtonBox = await addUserButton.boundingBox();
		expect(addButtonBox.width).toBe(40);
		expect(addButtonBox.height).toBe(40);
		await addUserButton.click();
		const userDialog = page.getByRole('dialog');
		await userDialog.getByLabel('Full name').fill(originalName);
		await userDialog.getByLabel('Gender').selectOption('OTHER');
		await userDialog.getByLabel('Date of birth').fill('1980-04-12');
		await userDialog.getByLabel('Email (required)').fill(email);
		await userDialog.getByLabel('Role').selectOption('USER');
		await userDialog.getByRole('button', { name: 'Create user' }).click();
		await expect(page.locator('.generated-password')).toContainText(email);

		let userRow = page.getByRole('row').filter({ hasText: email });
		await expect(userRow).toBeVisible();
		await expect(userRow.getByRole('button', { name: `Edit ${originalName}` })).toHaveAttribute('title', 'Edit');
		await expect(userRow.getByRole('button', { name: `Reset password for ${originalName}` })).toHaveAttribute('title', 'Reset password');
		await expect(userRow.getByRole('button', { name: `Archive ${originalName}` })).toHaveAttribute('title', 'Archive');
		await expect(userRow.getByRole('button', { name: `Delete account for ${originalName}` })).toHaveAttribute('title', 'Delete');
		const actionTops = await userRow.locator('.user-row-actions > *').evaluateAll((elements) =>
			elements.map((element) => element.getBoundingClientRect().top)
		);
		expect(Math.max(...actionTops) - Math.min(...actionTops)).toBeLessThan(1);
		await userRow.getByRole('button', { name: `Edit ${originalName}` }).click();
		await expect(userDialog.locator('form')).toHaveAttribute('action', /update/);
		await userDialog.getByLabel('Full name').fill(updatedName);
		await userDialog.getByLabel('Role').selectOption('ADMIN');
		await userDialog.getByRole('button', { name: 'Save changes' }).click();
		userRow = page.getByRole('row').filter({ hasText: email });
		await expect(userRow).toContainText('ADMIN');
		await userRow.getByRole('button', { name: `Reset password for ${updatedName}` }).click();
		await expect(page.locator('.generated-password')).toContainText(email);

		await userRow.getByRole('button', { name: `Archive ${updatedName}` }).click();
		await page.getByRole('button', { name: 'Archive', exact: true }).click();
		await expect(userRow).toContainText('Inactive');
		await userRow.getByRole('button', { name: `Reactivate ${updatedName}` }).click();
		await page.getByRole('button', { name: 'Reactivate', exact: true }).click();
		await expect(userRow).toContainText('Active');

		await userRow.getByRole('button', { name: `Delete account for ${updatedName}` }).click();
		await page.getByRole('button', { name: 'Delete account', exact: true }).click();
		await expect(userRow).toHaveCount(0);
	}
});
