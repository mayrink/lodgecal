<script>
	import PersonForm from '$lib/components/PersonForm.svelte';
	let { data, form } = $props();
</script>

<h1>Add person</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
<form method="POST" class="form-card wide stack">
	<PersonForm csrf={data.csrf} showSubmit={false} />
	<div class="field-grid">
		<div class="field">
			<label for="householdUserId">Attach to household (optional)</label>
			<select id="householdUserId" name="householdUserId">
				<option value="">None</option>
				{#each data.heads as head}
					<option value={head.user_id}>{head.full_name}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="relationship">Relationship</label>
			<select id="relationship" name="relationship">
				<option value="">—</option>
				<option value="SPOUSE">Spouse</option>
				<option value="CHILD">Child</option>
			</select>
		</div>
	</div>
	<button type="submit">Create person</button>
</form>
