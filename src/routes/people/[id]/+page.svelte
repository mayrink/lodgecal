<script>
	import PersonForm from '$lib/components/PersonForm.svelte';
	let { data, form } = $props();
	const terms = $derived(data.lodge?.terminology ?? {});

	function confirmEnd(event) {
		if (!confirm('End this relationship? The person record is kept.')) {
			event.preventDefault();
		}
	}
</script>

<div class="page-head">
	<h1>{data.person.full_name}</h1>
	{#if data.person.status !== 'ACTIVE'}
		<span class="badge">{data.person.status}</span>
	{/if}
</div>
<p class="muted">Age (admin only): {data.age}</p>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="muted">Saved.</p>
{/if}

<form method="POST" action="?/save" class="form-card wide stack">
	<PersonForm person={data.person} csrf={data.csrf} showStatus={true} />
</form>

<section class="stack" style="margin-top:1.5rem;max-width:40rem">
	<h2>Household</h2>
	{#if data.userRow && data.household}
		<p>This person is a Lodge member (User).</p>
		{#if data.household.spouse}
			<div>
				{terms.spouse || 'Spouse'}: {data.household.spouse.full_name}
				<form method="POST" action="?/endRelationship">
					<input type="hidden" name="csrf" value={data.csrf} />
					<input type="hidden" name="membershipId" value={data.household.spouse.membership_id} />
					<button class="danger" type="submit" onclick={confirmEnd}>End relationship</button>
				</form>
			</div>
		{/if}
		<ul>
			{#each data.household.children as child}
				<li>
					{child.full_name}
					<form method="POST" action="?/endRelationship">
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="membershipId" value={child.membership_id} />
						<button class="danger" type="submit" onclick={confirmEnd}>End relationship</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<form method="POST" action="?/attach" class="stack">
			<input type="hidden" name="csrf" value={data.csrf} />
			<label for="householdUserId">Attach to member household</label>
			<select id="householdUserId" name="householdUserId">
				{#each data.heads as head}
					<option value={head.user_id}>{head.full_name}</option>
				{/each}
			</select>
			<label for="relationship">Relationship</label>
			<select id="relationship" name="relationship">
				<option value="SPOUSE">Spouse</option>
				<option value="CHILD">Child</option>
			</select>
			<button type="submit">Attach</button>
		</form>
	{/if}
</section>

<section style="margin-top:1.5rem;max-width:40rem">
	<h2>Dated knowledge</h2>
	<form method="POST" action="?/addKnowledge" class="stack" style="margin-bottom:1rem">
		<input type="hidden" name="csrf" value={data.csrf} />
		<label for="body">New entry</label>
		<textarea id="body" name="body" required></textarea>
		<button type="submit">Add entry</button>
	</form>
	{#if data.knowledge.length === 0}
		<p class="muted">No entries.</p>
	{/if}
	{#each data.knowledge as entry}
		<article class="form-card" style="margin-bottom:0.65rem">
			<p>{entry.body}</p>
			<p class="muted">{entry.effective_date} — {entry.author_name}{entry.retired ? ' (retired)' : ''}</p>
			{#if !entry.retired}
				<form method="POST" action="?/retireKnowledge">
					<input type="hidden" name="csrf" value={data.csrf} />
					<input type="hidden" name="knowledgeId" value={entry.id} />
					<button class="secondary" type="submit">Retire</button>
				</form>
			{/if}
		</article>
	{/each}
</section>
