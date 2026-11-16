<script>
	let { form, data } = $props();
</script>

<form method="POST" class="auth-card stack">
	<div>
		<h1>Change password</h1>
		{#if data.forced}
			<p class="auth-sub" style="margin-bottom:0.25rem">
				You must set a new password before continuing.
			</p>
		{:else}
			<p class="auth-sub" style="margin-bottom:0.25rem">
				Choose a strong password of at least 10 characters.
			</p>
		{/if}
	</div>
	<input type="hidden" name="csrf" value={data.csrf} />
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<div>
		<label for="currentPassword">Current password</label>
		<input id="currentPassword" name="currentPassword" type="password" required />
	</div>
	<div>
		<label for="newPassword">New password</label>
		<input id="newPassword" name="newPassword" type="password" minlength="10" required />
	</div>
	<div>
		<label for="newPasswordConfirm">Confirm new password</label>
		<input id="newPasswordConfirm" name="newPasswordConfirm" type="password" minlength="10" required />
	</div>
	<button type="submit">Update password</button>
</form>
