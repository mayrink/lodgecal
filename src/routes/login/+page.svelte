<script>
	let { form, data } = $props();
	let showPassword = $state(false);
</script>

<form method="POST" class="auth-card">
	<h1>Sign in</h1>
	<p class="auth-sub">Use the account the lodge created for you.</p>
	<input type="hidden" name="csrf" value={data.csrf} />
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<div class="field-block">
		<label for="email">Email</label>
		<input
			id="email"
			name="email"
			type="email"
			autocomplete="username"
			placeholder="you@example.com"
			required
		/>
	</div>
	<div class="field-block">
		<div class="pw-head">
			<label for="password">Password</label>
			<button
				type="button"
				class="pw-toggle"
				onclick={() => (showPassword = !showPassword)}
			>
				{showPassword ? 'Hide' : 'Show'}
			</button>
		</div>
		<input
			id="password"
			name="password"
			type={showPassword ? 'text' : 'password'}
			autocomplete="current-password"
			required
		/>
	</div>
	<button type="submit" class="auth-submit">Sign in</button>
	<div class="auth-foot-note">
		Forgot your password, or no account yet? Accounts are created by the lodge superadmin. Ask the
		secretary to reset it for you.
	</div>
</form>

<style>
	.field-block {
		margin-bottom: 1.25rem;
	}

	.pw-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.375rem;
	}

	.pw-head label {
		margin: 0;
	}

	.pw-toggle {
		background: none;
		border: 0;
		padding: 0.25rem 0;
		min-height: auto;
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--accent);
	}

	.pw-toggle:hover {
		background: none;
		color: var(--primary);
	}

	.auth-submit {
		width: 100%;
		min-height: 3rem;
		margin-top: 0.5rem;
		font-size: 1rem;
	}
</style>
