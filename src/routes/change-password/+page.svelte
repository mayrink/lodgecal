<script>
	let { form, data } = $props();
</script>

<form method="POST" class="form-card stack">
	<h1>Change password</h1>
	{#if data.forced}
		<p class="muted">You must set a new password before continuing.</p>
	{/if}
	<input type="hidden" name="csrf" value={data.csrf} />
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<label for="currentPassword">Current password</label>
	<input id="currentPassword" name="currentPassword" type="password" required />
	<label for="newPassword">New password</label>
	<input id="newPassword" name="newPassword" type="password" minlength="10" required />
	<label for="newPasswordConfirm">Confirm new password</label>
	<input id="newPasswordConfirm" name="newPasswordConfirm" type="password" minlength="10" required />
	<button type="submit">Update password</button>
</form>
