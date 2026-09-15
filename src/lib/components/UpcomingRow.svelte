<script>
	let { item, showAdminMark = false } = $props();
</script>

<article class="row" class:inactive={item.inactive}>
	<div class="sheet" aria-hidden="true">
		<span class="day">{item.sheet.day}</span>
		<span class="month">{item.sheet.monthAbbr}</span>
	</div>
	<div class="body">
		<p class="title">{item.title}</p>
		<p class="context">{item.context}</p>
		{#if showAdminMark && item.inactive}
			<p class="mark">Inactive / departed</p>
		{/if}
	</div>
</article>

<style>
	.row {
		display: flex;
		gap: 0.85rem;
		align-items: center;
		padding: 0.65rem 0.75rem;
		border-bottom: 1px solid var(--border);
		min-height: 3.5rem;
	}

	.row:last-child {
		border-bottom: 0;
	}

	.inactive {
		opacity: 0.72;
		background: color-mix(in srgb, var(--bg-muted) 70%, transparent);
	}

	.sheet {
		flex: 0 0 3rem;
		width: 3rem;
		background: var(--calendar-bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		text-align: center;
		line-height: 1.1;
		padding: 0.3rem 0 0.35rem;
		box-shadow: 0 1px 0 var(--border);
	}

	.day {
		display: block;
		font-family: var(--font-sans);
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--calendar-day);
	}

	.month {
		display: block;
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.body {
		min-width: 0;
	}

	.title {
		margin: 0;
		font-weight: 600;
	}

	.context,
	.mark {
		margin: 0.1rem 0 0;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.mark {
		color: var(--danger);
		font-size: 0.8rem;
	}
</style>
