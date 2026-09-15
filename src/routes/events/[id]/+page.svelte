<script>
	let { data, form } = $props();
	let selectedTypeId = $state(null);
	const typeId = $derived(selectedTypeId ?? data.event.event_type_id);
	const selectedType = $derived(data.types.find((t) => String(t.id) === String(typeId)));
	const canRecur = $derived(Boolean(selectedType?.allows_recurrence));
	const related = $derived(new Set(data.event.people.map((p) => p.id)));
</script>

<h1>Edit event</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
<form method="POST" class="form-card stack">
	<input type="hidden" name="csrf" value={data.csrf} />
	<label for="title">Title</label>
	<input id="title" name="title" value={data.event.title} required />
	<label for="eventTypeId">Type</label>
	<select
		id="eventTypeId"
		name="eventTypeId"
		value={typeId}
		onchange={(e) => (selectedTypeId = e.currentTarget.value)}
		required
	>
		{#each data.types as type}
			<option value={type.id}>{type.label}</option>
		{/each}
	</select>
	<label for="isoDate">Date</label>
	<input id="isoDate" name="isoDate" type="date" value={data.event.iso_date} required />
	{#if canRecur}
		<label>
			<input type="checkbox" name="recurring" checked={Boolean(data.event.recurring)} />
			Recurs annually
		</label>
	{:else}
		<p class="muted">This type does not recur.</p>
	{/if}
	<label for="status">Status</label>
	<select id="status" name="status">
		<option value="ACTIVE" selected={data.event.status === 'ACTIVE'}>Active</option>
		<option value="ARCHIVED" selected={data.event.status === 'ARCHIVED'}>Archived</option>
	</select>
	<label for="details">Details</label>
	<textarea id="details" name="details">{data.event.details}</textarea>
	<label for="personIds">Related people</label>
	<select id="personIds" name="personIds" multiple size="6">
		{#each data.people as person}
			<option value={person.id} selected={related.has(person.id)}>{person.full_name}</option>
		{/each}
	</select>
	<button type="submit">Save</button>
</form>
