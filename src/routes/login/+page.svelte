<script>
	let { form, data } = $props();
</script>

<form method="POST" class="form-card stack">
	<h1>{data.lodge?.name || 'LodgeCal'}</h1>
	<p class="muted">Sign in with the email on your Person record.</p>
	<input type="hidden" name="csrf" value={data.csrf} />
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<label for="email">Email</label>
	<input id="email" name="email" type="email" autocomplete="username" required />
	<label for="password">Password</label>
	<input id="password" name="password" type="password" autocomplete="current-password" required />
	<button type="submit">Sign in</button>
</form>
