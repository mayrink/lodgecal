<script>
	import { Temporal } from '$lib/dates.js';
	import UpcomingRow from '$lib/components/UpcomingRow.svelte';
	let { data } = $props();

	const dateRange = $derived.by(() => {
		const from = Temporal.PlainDate.from(data.from);
		const to = Temporal.PlainDate.from(data.to);
		const fromOptions = { month: 'short', day: 'numeric' };
		if (from.year !== to.year) fromOptions.year = 'numeric';
		return {
			from: from.toLocaleString('en', fromOptions),
			to: to.toLocaleString('en', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			}),
		};
	});
</script>

<h1>Home</h1>
<p class="muted">
	{(data.lodge?.name ?? '') + (data.lodge?.number ? ` No. ${data.lodge.number}` : '')}
	{#if data.lodge?.obedience}· {data.lodge.obedience}{/if}
</p>

<section class="stats" aria-label="Statistics">
	<article class="stat-card">
		<div class="stat-n">{data.stats.brothers}</div>
		<div class="muted">Active Brothers</div>
	</article>
	<article class="stat-card">
		<div class="stat-n">{data.stats.people}</div>
		<div class="muted">Active people</div>
	</article>
	<article class="stat-card">
		<div class="stat-n">{data.stats.currentMonth}</div>
		<div class="muted">This month</div>
	</article>
	<article class="stat-card">
		<div class="stat-n">{data.stats.nextWindow}</div>
		<div class="muted">Next {data.upcomingWeeks} weeks</div>
	</article>
</section>

<section class="panel">
	<h2>Upcoming Birthdays &amp; Events</h2>
	<p class="muted period-range">
		<time datetime={data.from}>{dateRange.from}</time>
		<span aria-hidden="true">–</span>
		<time datetime={data.to}>{dateRange.to}</time>
	</p>
	{#each data.upcoming as item}
		<UpcomingRow {item} />
	{:else}
		<p class="muted">Nothing in the upcoming window.</p>
	{/each}
</section>

{#if data.isAdmin && data.adminInactive.length}
	<section class="panel admin-panel">
		<h2>Inactive / departed (admin)</h2>
		{#each data.adminInactive as item}
			<UpcomingRow {item} showAdminMark={true} />
		{/each}
	</section>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 1.25rem 0 1.5rem;
	}

	.stat-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		box-shadow: var(--shadow);
	}

	.stat-n {
		font-family: var(--font-sans);
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.1;
	}

	.panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem 0.35rem 0.35rem;
		box-shadow: var(--shadow);
		margin-bottom: 1.25rem;
	}

	.panel h2,
	.panel .muted {
		padding: 0 0.9rem;
	}

	.admin-panel {
		border-style: dashed;
	}

	@media (max-width: 800px) {
		.stats {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
