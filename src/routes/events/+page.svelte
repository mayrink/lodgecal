<script>
	let { data, form } = $props();
	let selectedTypeId = $state(null);
	const typeId = $derived(selectedTypeId ?? data.types[0]?.id);
	const selectedType = $derived(data.types.find((t) => String(t.id) === String(typeId)));
	const canRecur = $derived(Boolean(selectedType?.allows_recurrence));
</script>

<div class="page-head">
	<h1>Events</h1>
</div>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<form method="POST" action="?/create" class="form-card stack" style="margin-bottom:1.5rem">
	<input type="hidden" name="csrf" value={data.csrf} />
	<label for="title">Title</label>
	<input id="title" name="title" required />
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
	<input id="isoDate" name="isoDate" type="date" required />
	{#if canRecur}
		<label>
			<input type="checkbox" name="recurring" />
			Recurs annually
		</label>
	{:else}
		<p class="muted">This type does not recur.</p>
	{/if}
	<label for="details">Details</label>
	<textarea id="details" name="details"></textarea>
	<label for="personIds">Related people</label>
	<select id="personIds" name="personIds" multiple size="6">
		{#each data.people as person}
			<option value={person.id}>{person.full_name}</option>
		{/each}
	</select>
	<button type="submit">Create event</button>
</form>

<table>
	<thead>
		<tr>
			<th>Date</th>
			<th>Title</th>
			<th>Type</th>
			<th>Recurring</th>
			<th>People</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.events as event}
			<tr class:inactive={event.status !== 'ACTIVE'}>
				<td>{event.iso_date}</td>
				<td><a href="/events/{event.id}">{event.title}</a></td>
				<td>{event.type_label}</td>
				<td>{event.recurring ? 'Yes' : 'No'}</td>
				<td>{event.people.map((p) => p.full_name).join(', ')}</td>
				<td>
					{#if event.status === 'ACTIVE'}
						<form method="POST" action="?/archive">
							<input type="hidden" name="csrf" value={data.csrf} />
							<input type="hidden" name="eventId" value={event.id} />
							<button class="secondary" type="submit">Archive</button>
						</form>
					{:else}
						Archived
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
