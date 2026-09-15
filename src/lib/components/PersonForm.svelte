<script>
	let {
		person = null,
		csrf,
		showStatus = false,
		emailRequired = false,
		submitLabel = 'Save',
		showSubmit = true
	} = $props();
</script>

<input type="hidden" name="csrf" value={csrf} />
<div class="field-grid">
	<div class="field field-full">
		<label for="fullName">Full name</label>
		<input id="fullName" name="fullName" value={person?.full_name ?? person?.fullName ?? ''} required />
	</div>
	<div class="field">
		<label for="gender">Gender</label>
		<select id="gender" name="gender" required value={person?.gender ?? ''}>
			<option value="">Select</option>
			<option value="MALE">Male</option>
			<option value="FEMALE">Female</option>
			<option value="OTHER">Other</option>
		</select>
	</div>
	<div class="field">
		<label for="birthDate">Date of birth</label>
		<input
			id="birthDate"
			name="birthDate"
			type="date"
			value={person?.birth_date ?? person?.birthDate ?? ''}
			required
		/>
	</div>
	<div class="field">
		<label for="email">Email {emailRequired ? '(required)' : '(optional)'}</label>
		<input
			id="email"
			name="email"
			type="email"
			value={person?.email ?? ''}
			required={emailRequired}
		/>
	</div>
	<div class="field">
		<label for="phone">Phone</label>
		<input id="phone" name="phone" value={person?.phone ?? ''} />
	</div>
	{#if showStatus}
		<div class="field">
			<label for="status">Lifecycle status</label>
			<select id="status" name="status" value={person?.status ?? 'ACTIVE'}>
				<option value="ACTIVE">Active</option>
				<option value="INACTIVE">Inactive</option>
				<option value="DEPARTED">Departed</option>
			</select>
		</div>
	{/if}
</div>
{#if showSubmit}
	<button type="submit">{submitLabel}</button>
{/if}
