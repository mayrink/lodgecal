<script>
	import { Temporal, formatDayMonthShort } from '$lib/dates.js';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	let searchQuery = $state('');

	const weeks = $derived(data.upcomingWeeks ?? 4);

	const filteredBirthdays = $derived.by(() => {
		const maxDays = weeks * 7;
		const q = searchQuery.trim().toLowerCase();
		const list = data.birthdaysExtended ?? data.upcoming.filter((i) => i.kind === 'birthday');
		return list.filter((item) => {
			if (item.daysAway < 0 || item.daysAway > maxDays) return false;
			if (!q) return true;
			return (
				item.displayName?.toLowerCase().includes(q) ||
				item.title?.toLowerCase().includes(q) ||
				item.relation?.toLowerCase().includes(q)
			);
		});
	});

	const weekGroups = $derived.by(() => {
		const startPlain = Temporal.PlainDate.from(data.from);
		/** @type {Map<number, object[]>} */
		const byWeek = new Map();
		for (const item of filteredBirthdays) {
			const g = Math.floor(item.daysAway / 7);
			const arr = byWeek.get(g) ?? [];
			arr.push(item);
			byWeek.set(g, arr);
		}

		return Array.from(byWeek.keys())
			.sort((a, b) => a - b)
			.map((g) => {
				const weekStart = startPlain.add({ days: g * 7 });
				const weekEnd = weekStart.add({ days: 6 });
				const range =
					weekStart.month === weekEnd.month
						? `${weekStart.day}–${formatDayMonthShort(weekEnd)}`
						: `${formatDayMonthShort(weekStart)} – ${formatDayMonthShort(weekEnd)}`;
				const label = g === 0 ? 'This week' : g === 1 ? 'Next week' : `In ${g} weeks`;
				return {
					weekIndex: g,
					label,
					range,
					items: byWeek.get(g) ?? []
				};
			});
	});

	const visibleEvents = $derived.by(() => {
		const maxDays = Math.max(weeks, 8) * 7;
		return (data.lodgeEvents ?? []).filter((e) => e.daysAway >= 0 && e.daysAway <= maxDays);
	});
</script>

<div class="dashboard-layout">
	<section class="dashboard-main">
		<h1>Upcoming birthdays</h1>
		<p class="page-lead">
			Brothers, their wives and children. Showing the next {weeks} weeks, {filteredBirthdays.length}
			{filteredBirthdays.length === 1 ? 'birthday' : 'birthdays'}.
		</p>

		<div class="filter-bar">
			<div class="search-box">
				<label class="muted-label" for="find-name">Find a name</label>
				<input
					id="find-name"
					type="search"
					bind:value={searchQuery}
					placeholder="Search by name"
				/>
			</div>
			<div class="lookahead-box">
				<div class="lookahead-label">Look ahead</div>
				<div class="lookahead-static">
					<strong>{weeks} {weeks === 1 ? 'week' : 'weeks'}</strong>, until {data.untilFormatted}
				</div>
			</div>
		</div>

		<div class="groups-wrap">
			{#each weekGroups as group (group.weekIndex)}
				<section class="week-section">
					<div class="week-header">
						<h2>{group.label}</h2>
						<span class="week-range">{group.range}</span>
					</div>
					{#each group.items as item (item.id)}
						<article class="bday-row">
							<div class="bday-when">
								<div class="bday-date">{item.dateText}</div>
								<div class="bday-weekday">{item.weekday}</div>
								<div>
									<span class="pill" class:soon={item.daysAway <= 7}>{item.countdown}</span>
								</div>
							</div>

							<div class="bday-who">
								<div class="bday-name">{item.displayName}</div>
								<div class="bday-relation">{item.relation}</div>
								{#if item.turns}
									<div class="bday-turns">{item.turns}</div>
								{/if}
							</div>

							<div class="bday-details">
								{#if item.canSee}
									{#if item.trivia?.length}
										<div class="trivia-list">
											{#each item.trivia as tv (tv.id)}
												<span class="trivia-pill">
													<span>{tv.body}</span>
													<time class="trivia-date" datetime={tv.effectiveDate}
														>{tv.dateFormatted}</time
													>
												</span>
											{/each}
										</div>
									{:else}
										<div class="no-trivia">No notes yet for the birthday card.</div>
									{/if}

									{#if item.phone || item.email}
										<div class="contact-line">
											{#if item.phone}<span>{item.phone}</span>{/if}
											{#if item.email}<span>{item.email}</span>{/if}
										</div>
									{/if}

									{#if item.isMine}
										<div class="notes-action">
											<a href="/family#person-{item.personId}">Add or edit notes</a>
										</div>
									{:else if data.isAdmin}
										<div class="notes-action">
											<a href="/admin?tab=members">Add or edit notes</a>
										</div>
									{/if}
								{:else}
									<div class="privacy-notice">
										<Icon name="lock" />
										<span
											>Contact details and notes are private to this brother's family and the lodge
											officers.</span
										>
									</div>
								{/if}
							</div>
						</article>
					{/each}
				</section>
			{:else}
				<div class="empty-upcoming">
					No birthdays match in the next {weeks} weeks.
				</div>
			{/each}

			{#if data.isAdmin && data.adminInactive?.length}
				<section class="week-section sleeping-section">
					<div class="week-header">
						<h2>Sleeping or departed (admin only)</h2>
						<span class="week-range">Excluded from regular brothers' view</span>
					</div>
					{#each data.adminInactive as item (item.id)}
						<article class="bday-row inactive-row">
							<div class="bday-when">
								<div class="bday-date">{item.dateText}</div>
								<div class="bday-weekday">{item.weekday}</div>
								<div><span class="pill">{item.countdown}</span></div>
							</div>
							<div class="bday-who">
								<div class="bday-name">{item.displayName || item.title}</div>
								<div class="bday-relation">{item.relation || item.context}</div>
							</div>
							<div class="bday-details">
								<span class="pill">Sleeping / Departed</span>
							</div>
						</article>
					{/each}
				</section>
			{/if}
		</div>
	</section>

	<aside class="dashboard-aside">
		<div class="surface-card gold-top events-aside-card">
			<h2>Lodge events</h2>
			<p class="aside-sub">Set by the superadmin.</p>

			{#if visibleEvents.length}
				<div class="aside-events-list">
					{#each visibleEvents as ev (ev.id)}
						<div class="aside-event-item">
							<div class="aside-event-title">{ev.title}</div>
							<div class="aside-event-meta">
								{ev.weekday} {ev.dateText} &middot; {ev.countdown}
							</div>
							<div class="aside-event-sub">
								{ev.typeLabel}{ev.personName ? ` (${ev.personName})` : ''} &middot; {ev.repeatLabel}
							</div>
							{#if ev.details}
								<div class="aside-event-details">{ev.details}</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="aside-empty">No upcoming lodge events scheduled in this window.</p>
			{/if}

			{#if data.isAdmin}
				<div class="aside-admin-link">
					<a href="/admin?tab=events">Manage lodge events</a>
				</div>
			{/if}
		</div>

		<div class="gold-callout aside-callout">
			<div class="callout-title">Help the lodge find the right words</div>
			<p class="callout-body">
				A line or two about each person goes a long way. Add what they love, what they just
				achieved, what they dream of.
			</p>
			<div class="callout-link">
				<a href="/family">Go to my family</a>
			</div>
		</div>
	</aside>
</div>

<style>
	.dashboard-layout {
		display: flex;
		flex-wrap: wrap;
		gap: 3rem;
		align-items: flex-start;
	}

	.dashboard-main {
		flex: 999 1 38.75rem;
		min-width: 0;
	}

	.dashboard-aside {
		flex: 1 1 17.5rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
		align-items: flex-start;
		margin-top: 1.75rem;
	}

	.search-box {
		flex: 1 1 15rem;
	}

	.lookahead-label {
		font-size: 0.8125rem;
		color: var(--text2);
		margin-bottom: 0.375rem;
	}

	.lookahead-static {
		min-height: 2.875rem;
		padding: 0 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: 0.9375rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-variant-numeric: tabular-nums;
	}

	.groups-wrap {
		margin-top: 2.25rem;
	}

	.week-section {
		margin-bottom: 2.25rem;
	}

	.week-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 1rem;
		padding-bottom: 0.625rem;
		border-bottom: 2px solid var(--accent);
	}

	.week-header h2 {
		margin: 0;
		font-size: 1.375rem;
	}

	.week-range {
		font-size: 0.875rem;
		color: var(--text2);
		font-variant-numeric: tabular-nums;
	}

	.bday-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.75rem;
		padding: 1.375rem 0;
		border-bottom: 1px solid var(--border);
	}

	.bday-when {
		flex: 0 0 9.25rem;
		font-variant-numeric: tabular-nums;
	}

	.bday-date {
		font-family: var(--font-serif);
		font-size: 1.3125rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.bday-weekday {
		font-size: 0.875rem;
		color: var(--text2);
		margin-top: 0.125rem;
	}

	.bday-when .pill {
		margin-top: 0.5rem;
	}

	.bday-who {
		flex: 1 1 13.75rem;
		min-width: 0;
	}

	.bday-name {
		font-weight: 600;
		font-size: 1.0625rem;
		line-height: 1.35;
	}

	.bday-relation {
		font-size: 0.875rem;
		color: var(--text2);
		margin-top: 0.125rem;
		line-height: 1.4;
	}

	.bday-turns {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.bday-details {
		flex: 2 1 20rem;
		min-width: 0;
	}

	.trivia-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.trivia-pill {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.45rem;
		background: var(--tint);
		padding: 0.4375rem 0.75rem;
		border-radius: 999px;
		font-size: 0.875rem;
		line-height: 1.35;
	}

	.trivia-date {
		font-size: 0.75rem;
		color: var(--text2);
		font-variant-numeric: tabular-nums;
	}

	.no-trivia {
		font-size: 0.875rem;
		color: var(--text2);
	}

	.contact-line {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 1.25rem;
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: var(--text2);
	}

	.notes-action {
		margin-top: 0.625rem;
		font-size: 0.875rem;
	}

	.privacy-notice {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		font-size: 0.875rem;
		color: var(--text2);
		line-height: 1.5;
	}

	.privacy-notice :global(svg.icon) {
		width: 1rem;
		height: 1rem;
		margin-top: 0.2rem;
	}

	.empty-upcoming {
		padding: 2.5rem 0;
		color: var(--text2);
		font-size: 1rem;
	}

	.sleeping-section {
		opacity: 0.78;
	}

	/* Right Aside */
	.events-aside-card {
		padding: 1.5rem;
		border-radius: 12px;
	}

	.events-aside-card h2 {
		font-size: 1.25rem;
		margin: 0 0 0.25rem;
	}

	.aside-sub {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--text2);
	}

	.aside-event-item {
		padding: 0.875rem 0;
		border-top: 1px solid var(--border);
	}

	.aside-event-item:last-child {
		padding-bottom: 0;
	}

	.aside-event-title {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.aside-event-meta {
		font-size: 0.875rem;
		color: var(--text2);
		margin-top: 0.125rem;
	}

	.aside-event-sub {
		font-size: 0.8125rem;
		color: var(--text2);
		margin-top: 0.125rem;
	}

	.aside-event-details {
		font-size: 0.8125rem;
		color: var(--text2);
		margin-top: 0.25rem;
		font-style: italic;
	}

	.aside-empty {
		margin: 0.75rem 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
		color: var(--text2);
	}

	.aside-admin-link {
		margin-top: 1rem;
		padding-top: 0.875rem;
		border-top: 1px solid var(--border);
		font-size: 0.875rem;
	}

	.aside-callout {
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		font-size: 0.875rem;
	}

	.callout-title {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.callout-body {
		margin: 0;
	}

	.callout-link {
		margin-top: 0.75rem;
	}
</style>
