<script>
	let { form, data } = $props();
</script>

<form method="POST" class="auth-card wide stack">
	<div>
		<h1>LodgeCal setup</h1>
		<p class="auth-sub" style="margin-bottom:0.5rem">
			Create the Lodge profile and the first administrator. The database is initialized
			automatically.
		</p>
	</div>
	<input type="hidden" name="csrf" value={data.csrf} />
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<div class="field-grid">
		<div class="field">
			<label for="lodgeName">Lodge name</label>
			<input id="lodgeName" name="lodgeName" required />
		</div>
		<div class="field">
			<label for="lodgeNumber">Lodge number</label>
			<input id="lodgeNumber" name="lodgeNumber" />
		</div>
		<div class="field field-full">
			<label for="obedience">Obedience</label>
			<input id="obedience" name="obedience" placeholder="e.g. GLESP / GOP" />
		</div>
		<div class="field field-full">
			<label for="fullName">Administrator full name</label>
			<input id="fullName" name="fullName" required />
		</div>
		<div class="field">
			<label for="gender">Gender</label>
			<select id="gender" name="gender" required>
				<option value="">Select</option>
				<option value="MALE">Male</option>
				<option value="FEMALE">Female</option>
				<option value="OTHER">Other</option>
			</select>
		</div>
		<div class="field">
			<label for="birthDate">Date of birth</label>
			<input id="birthDate" name="birthDate" type="date" required />
		</div>
		<div class="field field-full">
			<label for="email">Email (login)</label>
			<input id="email" name="email" type="email" required />
		</div>
		<div class="field">
			<label for="password">Password</label>
			<input id="password" name="password" type="password" minlength="10" required />
		</div>
		<div class="field">
			<label for="passwordConfirm">Confirm password</label>
			<input id="passwordConfirm" name="passwordConfirm" type="password" minlength="10" required />
		</div>
	</div>
	<button type="submit">Complete setup</button>
</form>
