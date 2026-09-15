<script>
	import PersonForm from '$lib/components/PersonForm.svelte';
	let { data, form } = $props();
	const terms = $derived(data.lodge?.terminology ?? {});
</script>

<h1>My Family</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="muted">Saved.</p>
{/if}

{#if data.household?.spouse}
	<section class="form-card" style="margin-bottom:1rem">
		<h2>{terms.spouse || 'Spouse'}</h2>
		<form method="POST" action="?/saveMember" class="stack">
			<input type="hidden" name="personId" value={data.household.spouse.id} />
			<PersonForm person={data.household.spouse} csrf={data.csrf} submitLabel="Save spouse" />
		</form>
		{#each data.household.spouse.knowledge as entry}
			<p>{entry.body} <span class="muted">({entry.effective_date})</span></p>
		{/each}
		<form method="POST" action="?/knowledge" class="stack">
			<input type="hidden" name="csrf" value={data.csrf} />
			<input type="hidden" name="personId" value={data.household.spouse.id} />
			<label for="spouse-body">Add knowledge</label>
			<textarea id="spouse-body" name="body" required></textarea>
			<button type="submit">Add</button>
		</form>
	</section>
{:else}
	<section class="form-card" style="margin-bottom:1rem">
		<h2>Add {terms.spouse || 'spouse'}</h2>
		<form method="POST" action="?/addMember" class="stack">
			<input type="hidden" name="relationship" value="SPOUSE" />
			<PersonForm csrf={data.csrf} submitLabel="Add spouse" />
		</form>
	</section>
{/if}

<section>
	<h2>{terms.child || 'Children'}</h2>
	{#each data.household?.children ?? [] as child}
		<article class="form-card" style="margin-bottom:0.75rem">
			<form method="POST" action="?/saveMember" class="stack">
				<input type="hidden" name="personId" value={child.id} />
				<PersonForm person={child} csrf={data.csrf} submitLabel="Save child" />
			</form>
			{#each child.knowledge as entry}
				<p>{entry.body} <span class="muted">({entry.effective_date})</span></p>
			{/each}
			<form method="POST" action="?/knowledge" class="stack">
				<input type="hidden" name="csrf" value={data.csrf} />
				<input type="hidden" name="personId" value={child.id} />
				<label for="child-body-{child.id}">Add knowledge</label>
				<textarea id="child-body-{child.id}" name="body" required></textarea>
				<button type="submit">Add</button>
			</form>
		</article>
	{:else}
		<p class="muted">No children on record.</p>
	{/each}

	<div class="form-card">
		<h2>Add {terms.child || 'child'}</h2>
		<form method="POST" action="?/addMember" class="stack">
			<input type="hidden" name="relationship" value="CHILD" />
			<PersonForm csrf={data.csrf} submitLabel="Add child" />
		</form>
	</div>
</section>
