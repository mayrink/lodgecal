<script>
	let { data } = $props();

	let searchQuery = $state('');
	let showSleeping = $state(false);

	const rows = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return data.brothers.filter((b) => {
			if (!data.isAdmin && b.sleeping) return false;
			if (data.isAdmin && !showSleeping && b.sleeping) return false;
			if (!q) return true;
			return (
				b.name.toLowerCase().includes(q) ||
				b.fullName.toLowerCase().includes(q) ||
				b.email.toLowerCase().includes(q)
			);
		});
	});
</script>

<div class="brothers-page">
	<h1>Brothers</h1>
	<p class="page-lead">
		The brothers of our lodge. Families are private to each brother and the lodge officers.
	</p>

	<div class="brothers-toolbar">
		<div class="brothers-search">
			<label class="muted-label" for="find-brother">Find a brother</label>
			<input
				id="find-brother"
				type="search"
				bind:value={searchQuery}
				placeholder="Search by name"
			/>
		</div>
		{#if data.isAdmin}
			<label class="sleeping-toggle">
				<input type="checkbox" bind:checked={showSleeping} />
				Include sleeping brothers
			</label>
		{/if}
	</div>

	<div class="brothers-card">
		<div class="brothers-header">
			<div class="col-name">Name</div>
			<div class="col-bday">Birthday</div>
			<div class="col-contact">Contact</div>
		</div>

		{#each rows as row (row.id)}
			<div class="brother-row">
				<div class="col-name">
					<span class="brother-name" class:sleeping={row.sleeping}>{row.name}</span>
					{#if row.you}
						<span class="pill you">You</span>
					{/if}
					{#if data.isAdmin && row.sleeping}
						<span class="pill">{row.statusLabel}</span>
					{/if}
				</div>
				<div class="col-bday">{row.birthday}</div>
				<div class="col-contact">
					{#if row.phone}<div>{row.phone}</div>{/if}
					{#if row.email}<div>{row.email}</div>{/if}
				</div>
			</div>
		{:else}
			<div class="empty-brothers">No brother matches that name.</div>
		{/each}
	</div>

	<p class="brothers-count">
		Showing {rows.length} {rows.length === 1 ? 'brother' : 'brothers'}.
	</p>
</div>

<style>
	.brothers-page {
		max-width: 1000px;
	}

	.brothers-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.75rem;
		align-items: flex-end;
		margin-top: 1.75rem;
	}

	.brothers-search {
		flex: 1 1 16.25rem;
	}

	.brothers-card {
		margin-top: 1.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.brothers-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		padding: 0.875rem 1.75rem;
		background: var(--tint);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text2);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.brother-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 1.5rem;
		padding: 1.125rem 1.75rem;
		border-top: 1px solid var(--border);
		align-items: center;
	}

	.col-name {
		flex: 2 1 13.75rem;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.brother-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.brother-name.sleeping {
		color: var(--text2);
	}

	.col-bday {
		flex: 1 1 7.5rem;
		font-size: 0.9375rem;
	}

	.col-contact {
		flex: 2 1 15rem;
		min-width: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--text2);
	}

	.empty-brothers {
		padding: 2rem 1.75rem;
		border-top: 1px solid var(--border);
		color: var(--text2);
	}

	.brothers-count {
		margin: 1rem 0.25rem 0;
		font-size: 0.875rem;
		color: var(--text2);
	}

	@media (max-width: 640px) {
		.brothers-header {
			display: none;
		}

		.brother-row {
			padding: 1rem 1.25rem;
		}
	}
</style>
