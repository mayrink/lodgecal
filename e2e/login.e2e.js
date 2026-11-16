import { expect, test } from '@playwright/test';

test('first-run setup, login, upcoming birthdays, family, brothers actions, and admin', async ({ page }) => {
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

	// Look-ahead static display on dashboard
	await expect(page.locator('.lookahead-static')).toContainText(/weeks?, until /);

	// Navigate to Admin and create a test brother + check Lodge events category order
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click();
	await expect(page.locator('h1')).toHaveText('Lodge administration');

	// Check Lodge events tab category ordering and Repeats toggle
	await page.getByRole('tab', { name: 'Lodge events' }).click();
	await page.getByRole('button', { name: 'New event' }).click();
	const options = await page.locator('#ev-type option').allInnerTexts();
	expect(options.slice(0, 3)).toEqual(['Initiation', 'Elevation', 'Exaltation']);
	expect(options.at(-1)).toBe('Other');
	await expect(page.locator('#ev-repeats')).toBeDisabled();
	await page.selectOption('#ev-type', { label: 'Other' });
	await expect(page.locator('#ev-repeats')).toBeEnabled();

	// Create a brother on Admin -> Brothers and families
	await page.getByRole('tab', { name: 'Brothers and families' }).click();
	const email = `e2e-user-${Date.now()}@example.com`;
	const originalName = 'E2E Managed User';
	const updatedName = 'E2E Updated User';

	await page.getByRole('button', { name: 'New brother' }).click();
	await page.fill('#nb-name', originalName);
	await page.fill('#nb-email', email);
	await page.fill('#nb-birth', '1980-04-12');
	await page.getByRole('button', { name: 'Create brother' }).click();
	await expect(page.locator('.generated-password')).toContainText(email);

	// Navigate to Brothers directory and test Sortable Table, Edit slide-in pane, Sleep toggle, View, and Purge Delete modal
	await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Brothers' }).click();
	await expect(page.locator('h1')).toHaveText('Brothers');
	await expect(page.getByRole('button', { name: 'Sort by Name' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sort by Birthday' })).toBeVisible();

	let row = page.locator('tbody tr').filter({ hasText: email });
	await expect(row).toBeVisible();

	// Open slide-in Edit pane
	await row.getByRole('button', { name: /Edit / }).click();
	const pane = page.locator('aside.slide-pane');
	await expect(pane).toBeVisible();
	await pane.getByLabel('Full name').fill(updatedName);
	await pane.getByRole('button', { name: 'Save changes' }).click();
	await expect(pane).toHaveCount(0);

	row = page.locator('tbody tr').filter({ hasText: email });
	await expect(row).toContainText(updatedName);

	// Toggle Sleep on and off
	await row.getByRole('button', { name: /Mark .* as sleeping/ }).click();
	await expect(row).toContainText('Sleeping');
	await row.getByRole('button', { name: /wake from sleep/ }).click();

	// Purge Delete modal requiring exact name match
	await row.getByRole('button', { name: /Delete / }).click();
	const dialog = page.locator('dialog.purge-modal');
	await expect(dialog).toBeVisible();
	const deleteBtn = dialog.getByRole('button', { name: 'Delete permanently' });
	await expect(deleteBtn).toBeDisabled();

	await dialog.locator('#confirm-brother-name').fill('Wrong Name');
	await expect(deleteBtn).toBeDisabled();

	await dialog.locator('#confirm-brother-name').fill(`Bro∴ ${updatedName}`);
	await expect(deleteBtn).toBeEnabled();
	await deleteBtn.click();
	await expect(row).toHaveCount(0);
});
