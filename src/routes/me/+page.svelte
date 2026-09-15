<script>
	import PersonForm from '$lib/components/PersonForm.svelte';
	let { data, form } = $props();
</script>

<h1>My Details</h1>
{#if data.isAdmin && data.age != null}
	<p class="muted">Age (admin only): {data.age}</p>
{/if}
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="muted">Saved.</p>
{/if}

<form method="POST" action="?/save" class="form-card stack">
	<PersonForm person={data.person} csrf={data.csrf} emailRequired={true} />
</form>

<section style="margin-top:1.5rem;max-width:40rem">
	<h2>Dated knowledge</h2>
	<form method="POST" action="?/knowledge" class="stack" style="margin-bottom:1rem">
		<input type="hidden" name="csrf" value={data.csrf} />
		<label for="body">New entry</label>
		<textarea id="body" name="body" required></textarea>
		<button type="submit">Add entry</button>
	</form>
	{#each data.knowledge as entry}
		<article class="form-card" style="margin-bottom:0.65rem">
			<p>{entry.body}</p>
			<p class="muted">{entry.effective_date} — {entry.author_name}</p>
		</article>
	{:else}
		<p class="muted">No entries yet.</p>
	{/each}
</section>
