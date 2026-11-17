<script>
	import { enhance } from '$app/forms';
	import { Temporal, addWeeks, formatDateLongYear } from '$lib/dates.js';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, form } = $props();

	let activeTab = $state('members');
	let newBrotherOpen = $state(false);
	let openFamilyUserId = $state(null);
	let editBrotherUserId = $state(null);
	let confirmDeleteUserId = $state(null);
	let editFamilyPersonId = $state(null);
	let memberQuery = $state('');

	let newEventOpen = $state(false);
	let editEventId = $state(null);
	let showArchivedEvents = $state(false);
	let showEventCategories = $state(false);
	let selectedEventTypeId = $state(null);
	let editSelectedEventTypeId = $state(null);

	let sliderWeeks = $state(null);
	let toastKey = $state(0);

	$effect(() => {
		if (data.initialTab && ['members', 'events', 'settings'].includes(data.initialTab)) {
			activeTab = data.initialTab;
		}
	});

	function enhanceAction(onDone = () => {}) {
		return () =>
			async ({ result, update }) => {
				await update();
				if (result.type === 'success') {
					newBrotherOpen = false;
					editBrotherUserId = null;
					confirmDeleteUserId = null;
					editFamilyPersonId = null;
					newEventOpen = false;
					editEventId = null;
					toastKey = Temporal.Now.instant().epochMilliseconds;
					onDone();
				}
			};
	}

	const activeBrothersCount = $derived(
		data.brothers.filter((b) => !b.sleeping).length
	);
	const sleepingBrothersCount = $derived(
		data.brothers.filter((b) => b.sleeping).length
	);

	const filteredBrothers = $derived.by(() => {
		const q = memberQuery.trim().toLowerCase();
		if (!q) return data.brothers;
		return data.brothers.filter(
			(b) =>
				b.displayName.toLowerCase().includes(q) ||
				b.fullName.toLowerCase().includes(q) ||
				b.email.toLowerCase().includes(q) ||
				b.family.some((f) => f.fullName.toLowerCase().includes(q))
		);
	});

	const currentEventTypeId = $derived(selectedEventTypeId ?? data.types[0]?.id ?? null);
	const currentEventType = $derived(
		data.types.find((t) => String(t.id) === String(currentEventTypeId))
	);
	const canNewEventRecur = $derived(Boolean(currentEventType?.allows_recurrence));

	const visibleAdminEvents = $derived(
		data.events.filter((e) => showArchivedEvents || e.status === 'ACTIVE')
	);

	const weeksValue = $derived(sliderWeeks ?? data.settings?.upcomingWeeks ?? 4);
	const untilPreview = $derived.by(() => {
		const start = Temporal.PlainDate.from(data.today);
		return formatDateLongYear(addWeeks(start, Number(weeksValue)));
	});
</script>

<div class="admin-page">
	<h1>Lodge administration</h1>
	<p class="page-lead">
		Only the superadmin can create or remove brothers and family members, mark brothers as
		sleeping, and manage lodge events.
	</p>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	{#if form?.generatedPassword}
		<p class="generated-password" role="status">
			Temporary password for <strong>{form.newUserEmail}</strong>:
			<code>{form.generatedPassword}</code>
			— share it once with the brother. It will not be shown again.
		</p>
	{/if}
	{#if form?.saved && !form?.generatedPassword}
		{#key toastKey}
			<Toast message="Changes saved." duration={3500} />
		{/key}
	{/if}

	<div class="admin-tablist" role="tablist" aria-label="Administration">
		<button
			type="button"
			role="tab"
			class="admin-tab"
			class:active={activeTab === 'members'}
			aria-selected={activeTab === 'members'}
			onclick={() => (activeTab = 'members')}
		>
			Brothers and families
		</button>
		<button
			type="button"
			role="tab"
			class="admin-tab"
			class:active={activeTab === 'events'}
			aria-selected={activeTab === 'events'}
			onclick={() => (activeTab = 'events')}
		>
			Lodge events
		</button>
		<button
			type="button"
			role="tab"
			class="admin-tab"
			class:active={activeTab === 'settings'}
			aria-selected={activeTab === 'settings'}
			onclick={() => (activeTab = 'settings')}
		>
			Settings
		</button>
	</div>

	{#if activeTab === 'members'}
		<section class="admin-section">
			<div class="admin-bar">
				<div class="admin-bar-left">
					<p class="admin-counts">
						{activeBrothersCount} active, {sleepingBrothersCount} sleeping.
					</p>
					<input
						type="search"
						class="admin-search"
						bind:value={memberQuery}
						placeholder="Filter brothers or family..."
						aria-label="Filter brothers or family"
					/>
				</div>
				<button
					type="button"
					class="accent"
					onclick={() => (newBrotherOpen = !newBrotherOpen)}
				>
					{newBrotherOpen ? 'Close' : 'New brother'}
				</button>
			</div>

			{#if newBrotherOpen}
				<form
					method="POST"
					action="?/createBrother"
					class="surface-card gold-top inline-create-card"
					use:enhance={enhanceAction()}
				>
					<h2>New brother</h2>
					<input type="hidden" name="csrf" value={data.csrf} />
					<div class="admin-form-row">
						<div class="f-col-2">
							<label class="muted-label" for="nb-name">Full name</label>
							<input id="nb-name" name="fullName" type="text" required />
						</div>
						<div class="f-col-2">
							<label class="muted-label" for="nb-email">Email (used to sign in)</label>
							<input id="nb-email" name="email" type="email" required />
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="nb-birth">Birth date</label>
							<input id="nb-birth" name="birthDate" type="date" max={data.today} required />
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="nb-phone">Phone (optional)</label>
							<input id="nb-phone" name="phone" type="tel" />
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="nb-gender">Gender</label>
							<select id="nb-gender" name="gender">
								<option value="MALE">Male</option>
								<option value="FEMALE">Female</option>
								<option value="OTHER">Other</option>
							</select>
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="nb-role">Role</label>
							<select id="nb-role" name="role">
								<option value="USER">Brother (USER)</option>
								<option value="ADMIN">Superadmin (ADMIN)</option>
							</select>
						</div>
					</div>
					<div class="create-brother-foot">
						<button type="submit">Create brother</button>
						<span class="muted">
							A temporary password will be generated so he can sign in and set his own password.
						</span>
					</div>
				</form>
			{/if}

			<div class="admin-list-card">
				{#each filteredBrothers as b (b.userId)}
					<div class="admin-brother-block">
						<div class="admin-brother-row">
							<div class="brother-summary">
								<div class="brother-title-line">
									<span class="brother-title" class:sleeping={b.sleeping}
										>{b.displayName}</span
									>
									{#if b.sleeping}
										<span class="pill"
											>{b.status === 'DEPARTED' ? 'Departed' : 'Sleeping'}</span
										>
									{/if}
									{#if b.role === 'ADMIN'}
										<span class="pill tint">Superadmin</span>
									{/if}
								</div>
								<div class="brother-meta-line">
									{b.email}{#if b.phone} &middot; {b.phone}{/if} &middot; born {b.birthShort} (age {b.age})
								</div>
							</div>

							<div class="brother-actions">
								<button
									type="button"
									class="secondary action-btn"
									aria-expanded={openFamilyUserId === b.userId}
									onclick={() =>
										(openFamilyUserId = openFamilyUserId === b.userId ? null : b.userId)}
								>
									Family ({b.family.length})
								</button>
								<button
									type="button"
									class="secondary action-btn"
									aria-expanded={editBrotherUserId === b.userId}
									onclick={() =>
										(editBrotherUserId = editBrotherUserId === b.userId ? null : b.userId)}
								>
									{editBrotherUserId === b.userId ? 'Close' : 'Edit'}
								</button>
								<form method="POST" action="?/toggleSleep" use:enhance>
									<input type="hidden" name="csrf" value={data.csrf} />
									<input type="hidden" name="userId" value={b.userId} />
									<button type="submit" class="secondary action-btn">
										{b.sleeping ? 'Reactivate' : 'Mark sleeping'}
									</button>
								</form>
								<button
									type="button"
									class="danger-outline action-btn"
									onclick={() =>
										(confirmDeleteUserId =
											confirmDeleteUserId === b.userId ? null : b.userId)}
								>
									Delete
								</button>
							</div>
						</div>

						{#if confirmDeleteUserId === b.userId}
							<div class="delete-confirm-banner">
								<div class="delete-confirm-text">
									<strong>Delete {b.displayName}?</strong>
									{#if b.family.length}
										His login account will be removed ({b.family.length} family
										{b.family.length === 1 ? 'member remains' : 'members remain'} on record).
									{:else}
										His login account will be removed from the list.
									{/if}
									If he is no longer active, mark him as sleeping instead.
								</div>
								<div class="delete-confirm-actions">
									<button
										type="button"
										class="secondary action-btn"
										onclick={() => (confirmDeleteUserId = null)}
									>
										Keep
									</button>
									<form method="POST" action="?/deleteBrother" use:enhance={enhanceAction()}>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="userId" value={b.userId} />
										<button type="submit" class="danger-outline action-btn strong-warn">
											Delete permanently
										</button>
									</form>
								</div>
							</div>
						{/if}

						{#if editBrotherUserId === b.userId}
							<div class="drawer-panel">
								<form method="POST" action="?/updateBrother" use:enhance={enhanceAction()}>
									<input type="hidden" name="csrf" value={data.csrf} />
									<input type="hidden" name="userId" value={b.userId} />
									<div class="admin-form-row">
										<div class="f-col-2">
											<label class="muted-label" for="eb-name-{b.userId}">Full name</label>
											<input
												id="eb-name-{b.userId}"
												name="fullName"
												value={b.fullName}
												required
											/>
										</div>
										<div class="f-col-2">
											<label class="muted-label" for="eb-email-{b.userId}">Email</label>
											<input
												id="eb-email-{b.userId}"
												name="email"
												type="email"
												value={b.email}
												required
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="eb-phone-{b.userId}">Phone</label>
											<input
												id="eb-phone-{b.userId}"
												name="phone"
												type="tel"
												value={b.phone}
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="eb-birth-{b.userId}">Birth date</label>
											<input
												id="eb-birth-{b.userId}"
												name="birthDate"
												type="date"
												value={b.birthDate}
												max={data.today}
												required
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="eb-gender-{b.userId}">Gender</label>
											<select id="eb-gender-{b.userId}" name="gender" value={b.gender}>
												<option value="MALE">Male</option>
												<option value="FEMALE">Female</option>
												<option value="OTHER">Other</option>
											</select>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="eb-role-{b.userId}">Role</label>
											<select id="eb-role-{b.userId}" name="role" value={b.role}>
												<option value="USER">USER</option>
												<option value="ADMIN">ADMIN</option>
											</select>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="eb-status-{b.userId}">Status</label>
											<select id="eb-status-{b.userId}" name="status" value={b.status}>
												<option value="ACTIVE">Active</option>
												<option value="INACTIVE">Sleeping (Inactive)</option>
												<option value="DEPARTED">Departed</option>
											</select>
										</div>
									</div>
									<div class="drawer-actions-bar">
										<button type="submit">Save brother</button>
										<button
											type="button"
											class="secondary"
											onclick={() => (editBrotherUserId = null)}
										>
											Cancel
										</button>
									</div>
								</form>

								<div class="password-reset-strip">
									<span class="muted">
										Need to reset {b.displayName}'s sign-in password?
									</span>
									<form method="POST" action="?/resetPassword" use:enhance>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="userId" value={b.userId} />
										<button type="submit" class="secondary action-btn">
											Issue temporary password
										</button>
									</form>
								</div>
							</div>
						{/if}

						{#if openFamilyUserId === b.userId}
							<div class="drawer-panel">
								<div class="drawer-subsection">
									<div class="drawer-subtitle">
										Birthday notes for {b.displayName}
									</div>
									{#if b.knowledge.length}
										<div class="drawer-notes-pills">
											{#each b.knowledge as k (k.id)}
												<span class="drawer-note-tag">
													<span>{k.body}</span>
													<small class="muted">({k.dateFormatted})</small>
													<form method="POST" action="?/removeNote" use:enhance>
														<input type="hidden" name="csrf" value={data.csrf} />
														<input type="hidden" name="knowledgeId" value={k.id} />
														<button
															type="submit"
															class="tag-remove-btn"
															aria-label="Remove note"
															title="Remove note">&times;</button
														>
													</form>
												</span>
											{/each}
										</div>
									{/if}
									<form
										method="POST"
										action="?/addNote"
										class="compact-note-form"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update({ reset: result.type === 'success' });
											};
										}}
									>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="personId" value={b.personId} />
										<input
											name="body"
											type="text"
											placeholder="Add a birthday note for {b.fullName}..."
											required
										/>
										<input
											name="effectiveDate"
											type="date"
											value={data.today}
											class="compact-date"
											required
										/>
										<button type="submit" class="secondary action-btn">Add note</button>
									</form>
								</div>

								<div class="drawer-subsection">
									<div class="drawer-subtitle">Household members</div>
									{#if b.family.length}
										<ul class="admin-fam-list">
											{#each b.family as f (f.membershipId)}
												<li class="admin-fam-item">
													<div class="admin-fam-line">
														<div>
															<strong>{f.fullName}</strong>
															<span class="muted"> {f.relationLabel}</span>
														</div>
														<div class="admin-fam-right">
															<span class="muted"
																>{f.birthShort} (age {f.age})</span
															>
															<button
																type="button"
																class="secondary small-btn"
																onclick={() =>
																	(editFamilyPersonId =
																		editFamilyPersonId === f.personId
																			? null
																			: f.personId)}
															>
																{editFamilyPersonId === f.personId
																	? 'Close'
																	: 'Edit'}
															</button>
															<form
																method="POST"
																action="?/removeFamilyMember"
																use:enhance
															>
																<input
																	type="hidden"
																	name="csrf"
																	value={data.csrf}
																/>
																<input
																	type="hidden"
																	name="membershipId"
																	value={f.membershipId}
																/>
																<button
																	type="submit"
																	class="danger-outline small-btn"
																>
																	Delete
																</button>
															</form>
														</div>
													</div>

													{#if editFamilyPersonId === f.personId}
														<form
															method="POST"
															action="?/updateFamilyMember"
															class="fam-edit-box"
															use:enhance
														>
															<input type="hidden" name="csrf" value={data.csrf} />
															<input
																type="hidden"
																name="personId"
																value={f.personId}
															/>
															<div class="admin-form-row">
																<div class="f-col-2">
																	<label
																		class="muted-label"
																		for="ef-name-{f.personId}">Full name</label
																	>
																	<input
																		id="ef-name-{f.personId}"
																		name="fullName"
																		value={f.fullName}
																		required
																	/>
																</div>
																<div class="f-col-1">
																	<label
																		class="muted-label"
																		for="ef-birth-{f.personId}">Birth date</label
																	>
																	<input
																		id="ef-birth-{f.personId}"
																		name="birthDate"
																		type="date"
																		value={f.birthDate}
																		max={data.today}
																		required
																	/>
																</div>
																<div class="f-col-1">
																	<label
																		class="muted-label"
																		for="ef-gender-{f.personId}">Gender</label
																	>
																	<select
																		id="ef-gender-{f.personId}"
																		name="gender"
																		value={f.gender}
																	>
																		<option value="FEMALE">Female</option>
																		<option value="MALE">Male</option>
																		<option value="OTHER">Other</option>
																	</select>
																</div>
																<div class="f-col-1">
																	<label
																		class="muted-label"
																		for="ef-phone-{f.personId}">Phone</label
																	>
																	<input
																		id="ef-phone-{f.personId}"
																		name="phone"
																		value={f.phone}
																	/>
																</div>
																<div class="f-col-1">
																	<label
																		class="muted-label"
																		for="ef-email-{f.personId}">Email</label
																	>
																	<input
																		id="ef-email-{f.personId}"
																		name="email"
																		type="email"
																		value={f.email}
																	/>
																</div>
															</div>
															<div class="drawer-actions-bar">
																<button type="submit" class="action-btn">Save</button>
															</div>
														</form>
													{/if}

													{#if f.knowledge.length}
														<div class="drawer-notes-pills" style="margin-top:0.5rem">
															{#each f.knowledge as k (k.id)}
																<span class="drawer-note-tag">
																	<span>{k.body}</span>
																	<small class="muted">({k.dateFormatted})</small>
																	<form
																		method="POST"
																		action="?/removeNote"
																		use:enhance
																	>
																		<input
																			type="hidden"
																			name="csrf"
																			value={data.csrf}
																		/>
																		<input
																			type="hidden"
																			name="knowledgeId"
																			value={k.id}
																		/>
																		<button
																			type="submit"
																			class="tag-remove-btn"
																			aria-label="Remove note"
																			>&times;</button
																		>
																	</form>
																</span>
															{/each}
														</div>
													{/if}
													<form
														method="POST"
														action="?/addNote"
														class="compact-note-form"
														style="margin-top:0.5rem"
														use:enhance={() => {
															return async ({ result, update }) => {
																await update({ reset: result.type === 'success' });
															};
														}}
													>
														<input type="hidden" name="csrf" value={data.csrf} />
														<input type="hidden" name="personId" value={f.personId} />
														<input
															name="body"
															type="text"
															placeholder="Add a birthday note for {f.fullName}..."
															required
														/>
														<input
															name="effectiveDate"
															type="date"
															value={data.today}
															class="compact-date"
															required
														/>
														<button type="submit" class="secondary small-btn"
															>Add note</button
														>
													</form>
												</li>
											{/each}
										</ul>
									{:else}
										<div class="muted" style="margin-bottom:1rem;font-size:0.875rem">
											No family members yet.
										</div>
									{/if}

									<form
										method="POST"
										action="?/addFamilyMember"
										class="admin-form-row"
										style="align-items:flex-end"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update({ reset: result.type === 'success' });
											};
										}}
									>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="userId" value={b.userId} />
										<div class="f-col-2">
											<label class="muted-label" for="fn-{b.userId}"
												>New family member</label
											>
											<input
												id="fn-{b.userId}"
												name="fullName"
												type="text"
												placeholder="Full name"
												required
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="fr-{b.userId}">Relation</label>
											<select id="fr-{b.userId}" name="relationChoice">
												<option value="Wife">Wife</option>
												<option value="Son">Son</option>
												<option value="Daughter">Daughter</option>
												<option value="Spouse">Spouse</option>
												<option value="Child">Child</option>
											</select>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="fb-{b.userId}">Birth date</label>
											<input
												id="fb-{b.userId}"
												name="birthDate"
												type="date"
												max={data.today}
												required
											/>
										</div>
										<div>
											<button type="submit" class="action-btn">Add</button>
										</div>
									</form>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="empty-admin-rows">No brothers match that filter.</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if activeTab === 'events'}
		<section class="admin-section">
			<div class="admin-bar">
				<div class="admin-bar-left">
					<p class="admin-counts">
						Events appear beside the birthday list for every brother.
					</p>
					<label>
						<input type="checkbox" bind:checked={showArchivedEvents} />
						Show archived events
					</label>
				</div>
				<button
					type="button"
					class="accent"
					onclick={() => (newEventOpen = !newEventOpen)}
				>
					{newEventOpen ? 'Close' : 'New event'}
				</button>
			</div>

			<datalist id="lodge-people-list">
				{#each data.peopleNames as pName}
					<option value={pName}></option>
				{/each}
			</datalist>

			{#if newEventOpen}
				<form
					method="POST"
					action="?/createEvent"
					class="surface-card gold-top inline-create-card"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update({ reset: result.type === 'success' });
						};
					}}
				>
					<h2>New event</h2>
					<input type="hidden" name="csrf" value={data.csrf} />
					<div class="admin-form-row">
						<div class="f-col-2">
							<label class="muted-label" for="ev-title">Title</label>
							<input
								id="ev-title"
								name="title"
								type="text"
								placeholder="e.g. Regular meeting, Initiation of Bro. Silva"
								required
							/>
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="ev-type">Category</label>
							<select
								id="ev-type"
								name="eventTypeId"
								bind:value={selectedEventTypeId}
								required
							>
								{#each data.types as t}
									<option value={t.id}>{t.label}</option>
								{/each}
							</select>
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="ev-date">Date</label>
							<input id="ev-date" name="isoDate" type="date" required />
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="ev-repeats">Repeats</label>
							<label class="toggle-switch" for="ev-repeats">
								<input
									id="ev-repeats"
									type="checkbox"
									name="recurring"
									disabled={!canNewEventRecur}
									checked={false}
								/>
								<span>{canNewEventRecur ? 'Repeats yearly' : 'One-time milestone'}</span>
							</label>
						</div>
						<div class="f-col-1">
							<label class="muted-label" for="ev-person">Related person (optional)</label>
							<input
								id="ev-person"
								name="personName"
								list="lodge-people-list"
								placeholder="e.g. Bro. Name"
							/>
						</div>
						<div class="f-col-2">
							<label class="muted-label" for="ev-details">Time / details (optional)</label>
							<input
								id="ev-details"
								name="details"
								type="text"
								placeholder="e.g. 7:30 pm · Fellowship supper after"
							/>
						</div>
					</div>
					<div class="create-brother-foot">
						<button type="submit">Save event</button>
					</div>
				</form>
			{/if}

			<div class="admin-list-card">
				{#each visibleAdminEvents as ev (ev.id)}
					<div class="admin-brother-block">
						<div class="admin-brother-row">
							<div class="brother-summary">
								<div class="brother-title-line">
									<span
										class="brother-title"
										class:sleeping={ev.status !== 'ACTIVE'}>{ev.title}</span
									>
									<span class="pill">{ev.type_label}</span>
									{#if ev.status !== 'ACTIVE'}
										<span class="pill">Archived</span>
									{/if}
								</div>
								<div class="brother-meta-line">
									{ev.dateFormatted}{#if ev.person_name} &middot; {ev.person_name}{/if}{#if ev.details} &middot; {ev.details}{/if}
								</div>
							</div>

							<div class="brother-actions">
								<span class="pill" class:tint={ev.recurringBool}>{ev.repLabel}</span>
								<button
									type="button"
									class="secondary action-btn"
									onclick={() => {
										editEventId = editEventId === ev.id ? null : ev.id;
										editSelectedEventTypeId = ev.event_type_id;
									}}
								>
									{editEventId === ev.id ? 'Close' : 'Edit'}
								</button>
								{#if ev.status === 'ACTIVE'}
									<form method="POST" action="?/archiveEvent" use:enhance>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="eventId" value={ev.id} />
										<button type="submit" class="danger-outline action-btn">
											Delete
										</button>
									</form>
								{:else}
									<form method="POST" action="?/reactivateEvent" use:enhance>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="eventId" value={ev.id} />
										<button type="submit" class="secondary action-btn">
											Reactivate
										</button>
									</form>
								{/if}
							</div>
						</div>

						{#if editEventId === ev.id}
							{@const editType = data.types.find(
								(t) => String(t.id) === String(editSelectedEventTypeId ?? ev.event_type_id)
							)}
							<div class="drawer-panel">
								<form method="POST" action="?/updateEvent" use:enhance>
									<input type="hidden" name="csrf" value={data.csrf} />
									<input type="hidden" name="id" value={ev.id} />
									<div class="admin-form-row">
										<div class="f-col-2">
											<label class="muted-label" for="ed-ev-title-{ev.id}">Title</label>
											<input
												id="ed-ev-title-{ev.id}"
												name="title"
												value={ev.title}
												required
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="ed-ev-type-{ev.id}">Category</label>
											<select
												id="ed-ev-type-{ev.id}"
												name="eventTypeId"
												bind:value={editSelectedEventTypeId}
											>
												{#each data.types as t}
													<option value={t.id}>{t.label}</option>
												{/each}
											</select>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="ed-ev-date-{ev.id}">Date</label>
											<input
												id="ed-ev-date-{ev.id}"
												name="isoDate"
												type="date"
												value={ev.iso_date}
												required
											/>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="ed-ev-rep-{ev.id}">Repeats</label>
											<label class="toggle-switch" for="ed-ev-rep-{ev.id}">
												<input
													id="ed-ev-rep-{ev.id}"
													type="checkbox"
													name="recurring"
													disabled={!editType?.allows_recurrence}
													checked={Boolean(editType?.allows_recurrence && ev.recurringBool)}
												/>
												<span
													>{editType?.allows_recurrence
														? 'Repeats yearly'
														: 'One-time milestone'}</span
												>
											</label>
										</div>
										<div class="f-col-1">
											<label class="muted-label" for="ed-ev-person-{ev.id}"
												>Related person</label
											>
											<input
												id="ed-ev-person-{ev.id}"
												name="personName"
												list="lodge-people-list"
												value={ev.person_name}
											/>
										</div>
										<div class="f-col-2">
											<label class="muted-label" for="ed-ev-details-{ev.id}"
												>Time / details</label
											>
											<input
												id="ed-ev-details-{ev.id}"
												name="details"
												value={ev.details}
											/>
										</div>
									</div>
									<div class="drawer-actions-bar">
										<button type="submit">Save changes</button>
										<button
											type="button"
											class="secondary"
											onclick={() => (editEventId = null)}
										>
											Cancel
										</button>
									</div>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<div class="empty-admin-rows">No events yet.</div>
				{/each}
			</div>

			<div class="categories-box">
				<button
					type="button"
					class="secondary"
					onclick={() => (showEventCategories = !showEventCategories)}
				>
					{showEventCategories
						? 'Hide event categories'
						: 'Manage custom event categories'}
				</button>

				{#if showEventCategories}
					<div class="surface-card categories-panel">
						<h3>Event categories</h3>
						<p class="muted" style="margin:0.25rem 0 1rem;font-size:0.875rem">
							System categories (Initiation, Elevation, Exaltation, Wedding anniversary, Lodge
							anniversary, Other) are built in. You can add custom categories for your
							lodge below.
						</p>
						<div class="categories-chips">
							{#each data.allTypes as t (t.id)}
								<div class="category-chip" class:sleeping={!t.is_active}>
									<strong>{t.label}</strong>
									<span class="muted"
										>({t.allows_recurrence ? 'can repeat annually' : 'one-time only'})</span
									>
									{#if !t.is_system}
										<form method="POST" action="?/toggleEventType" use:enhance>
											<input type="hidden" name="csrf" value={data.csrf} />
											<input type="hidden" name="id" value={t.id} />
											<input
												type="hidden"
												name="active"
												value={t.is_active ? '0' : '1'}
											/>
											<button type="submit" class="tag-remove-btn" title={t.is_active ? 'Archive category' : 'Reactivate category'}>
												{t.is_active ? '×' : 'Restore'}
											</button>
										</form>
									{/if}
								</div>
							{/each}
						</div>

						<form
							method="POST"
							action="?/createEventType"
							class="admin-form-row"
							style="margin-top:1.25rem;align-items:flex-end"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update({ reset: result.type === 'success' });
								};
							}}
						>
							<input type="hidden" name="csrf" value={data.csrf} />
							<div class="f-col-2">
								<label class="muted-label" for="new-cat-label">New category name</label>
								<input
									id="new-cat-label"
									name="label"
									placeholder="e.g. Festive board, Installation"
									required
								/>
							</div>
							<label>
								<input type="checkbox" name="allowsRecurrence" checked />
								Allows annual recurrence
							</label>
							<button type="submit" class="action-btn">Add category</button>
						</form>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	{#if activeTab === 'settings'}
		<section class="admin-section">
			<form method="POST" action="?/saveSettings" class="settings-stack" use:enhance>
				<input type="hidden" name="csrf" value={data.csrf} />

				<div class="surface-card gold-top settings-card">
					<h2>Birthday window</h2>
					<p class="muted" style="margin:0 0 1.5rem;font-size:0.9375rem">
						How far ahead brothers see upcoming birthdays by default. They can still look 4 to 8
						weeks ahead on the list.
					</p>
					<label for="weeks-range">
						Default: <strong>{weeksValue} weeks</strong>
					</label>
					<input
						id="weeks-range"
						name="upcomingWeeks"
						type="range"
						min="4"
						max="12"
						step="1"
						bind:value={sliderWeeks}
					/>
					<div class="range-marks">
						<span>4 weeks</span>
						<span>8 weeks</span>
						<span>12 weeks</span>
					</div>
					<div class="until-preview">
						With {weeksValue} weeks, brothers will see birthdays up to
						<strong>{untilPreview}</strong>.
					</div>
				</div>

				<div class="surface-card settings-card">
					<h2>Lodge identity &amp; terminology</h2>
					<p class="muted" style="margin:0 0 1.25rem;font-size:0.9375rem">
						Displayed in the navigation bar, sign-in screen, and member relationship labels.
					</p>
					<div class="field-grid">
						<div class="field">
							<label for="s-name">Lodge name</label>
							<input id="s-name" name="name" value={data.settings.name} required />
						</div>
						<div class="field">
							<label for="s-number">Number</label>
							<input id="s-number" name="number" value={data.settings.number} />
						</div>
						<div class="field">
							<label for="s-obedience">Obedience</label>
							<input id="s-obedience" name="obedience" value={data.settings.obedience} />
						</div>
						<div class="field">
							<label for="s-logo">Logo URL (optional)</label>
							<input id="s-logo" name="logoUrl" value={data.settings.logoUrl} />
						</div>
						<div class="field">
							<label for="s-email">Contact email</label>
							<input
								id="s-email"
								name="contactEmail"
								type="email"
								value={data.settings.contactEmail}
							/>
						</div>
						<div class="field">
							<label for="s-phone">Contact phone</label>
							<input id="s-phone" name="contactPhone" value={data.settings.contactPhone} />
						</div>
						<div class="field field-full">
							<label for="s-address">Address</label>
							<textarea id="s-address" name="address" rows="2"
								>{data.settings.address}</textarea
							>
						</div>
						<div class="field">
							<label for="t-bro">Brother prefix</label>
							<input
								id="t-bro"
								name="termBrother"
								value={data.settings.terminology.brother}
							/>
						</div>
						<div class="field">
							<label for="t-sp">Spouse label</label>
							<input
								id="t-sp"
								name="termSpouse"
								value={data.settings.terminology.spouse}
							/>
						</div>
						<div class="field">
							<label for="t-son">Son label</label>
							<input id="t-son" name="termSon" value={data.settings.terminology.son} />
						</div>
						<div class="field">
							<label for="t-dau">Daughter label</label>
							<input
								id="t-dau"
								name="termDaughter"
								value={data.settings.terminology.daughter}
							/>
						</div>
					</div>
					<div style="margin-top:1.5rem">
						<button type="submit">Save settings</button>
					</div>
				</div>
			</form>
		</section>
	{/if}
</div>

<style>
	.admin-page {
		max-width: 1100px;
	}

	.admin-tablist {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 2rem;
		border-bottom: 1px solid var(--border);
	}

	.admin-tab {
		padding: 0.75rem 1.125rem;
		min-height: 2.75rem;
		border: 0;
		border-bottom: 3px solid transparent;
		border-radius: 0;
		background: transparent;
		color: var(--text2);
		font-size: 0.9375rem;
		font-weight: 400;
	}

	.admin-tab:hover {
		background: var(--tint);
		color: var(--text);
	}

	.admin-tab.active {
		border-bottom-color: var(--accent);
		color: var(--text);
		font-weight: 600;
	}

	.admin-section {
		margin-top: 1.75rem;
	}

	.admin-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		align-items: center;
		justify-content: space-between;
	}

	.admin-bar-left {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
		flex: 1 1 20rem;
	}

	.admin-counts {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--text2);
	}

	.admin-search {
		max-width: 18rem;
		min-height: 2.6rem !important;
	}

	.inline-create-card {
		margin-top: 1rem;
		padding: 1.5rem 1.75rem;
	}

	.inline-create-card h2 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
	}

	.admin-form-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.f-col-2 {
		flex: 2 1 14rem;
	}

	.f-col-1 {
		flex: 1 1 9.5rem;
	}

	.create-brother-foot {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
		margin-top: 1.125rem;
		font-size: 0.875rem;
	}

	.admin-list-card {
		margin-top: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.admin-brother-block {
		border-top: 1px solid var(--border);
	}

	.admin-brother-block:first-child {
		border-top: 0;
	}

	.admin-brother-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		align-items: center;
		padding: 1rem 1.5rem;
	}

	.brother-summary {
		flex: 2 1 15rem;
		min-width: 0;
	}

	.brother-title-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.brother-title {
		font-weight: 600;
		font-size: 1rem;
	}

	.brother-title.sleeping {
		color: var(--text2);
	}

	.brother-meta-line {
		font-size: 0.875rem;
		color: var(--text2);
		margin-top: 0.125rem;
	}

	.brother-actions {
		flex: 0 1 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.action-btn {
		min-height: 2.75rem;
		padding: 0 1rem;
		font-size: 0.875rem;
	}

	.small-btn {
		min-height: 2.35rem;
		padding: 0 0.75rem;
		font-size: 0.8125rem;
	}

	.delete-confirm-banner {
		margin: 0 1.5rem 1rem;
		padding: 1rem 1.25rem;
		background: var(--warntint);
		border: 1px solid var(--warn);
		border-radius: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		align-items: center;
		justify-content: space-between;
	}

	.delete-confirm-text {
		flex: 1 1 20rem;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 0.5rem;
	}

	.strong-warn {
		border-width: 2px;
		font-weight: 600;
		background: var(--surface);
	}

	.drawer-panel {
		margin: 0 1.5rem 1.25rem;
		padding: 1.125rem 1.25rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 10px;
	}

	.drawer-subsection + .drawer-subsection {
		margin-top: 1.25rem;
		padding-top: 1.125rem;
		border-top: 1px solid var(--border);
	}

	.drawer-subtitle {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.625rem;
	}

	.drawer-actions-bar {
		display: flex;
		gap: 0.625rem;
		margin-top: 1rem;
	}

	.password-reset-strip {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.drawer-notes-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.drawer-note-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--tint);
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		font-size: 0.8125rem;
	}

	.tag-remove-btn {
		min-height: auto;
		width: 1.4rem;
		height: 1.4rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text2);
		font-size: 1rem;
		line-height: 1;
	}

	.tag-remove-btn:hover {
		background: rgba(0, 0, 0, 0.08);
		color: var(--warn);
	}

	.compact-note-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.compact-note-form input[type='text'] {
		flex: 1 1 14rem;
		min-height: 2.5rem;
		background: var(--surface);
	}

	.compact-note-form .compact-date {
		flex: 0 1 9.5rem;
		min-height: 2.5rem;
		background: var(--surface);
	}

	.admin-fam-list {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
	}

	.admin-fam-item {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
		font-size: 0.9375rem;
	}

	.admin-fam-line {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		justify-content: space-between;
		align-items: center;
	}

	.admin-fam-right {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.fam-edit-box {
		margin-top: 0.75rem;
		padding: 0.875rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.empty-admin-rows {
		padding: 1.75rem 1.5rem;
		color: var(--text2);
	}

	.categories-box {
		margin-top: 1.5rem;
	}

	.categories-panel {
		margin-top: 0.875rem;
	}

	.categories-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.category-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.8125rem;
	}

	.settings-stack {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 760px;
	}

	.settings-card h2 {
		margin: 0 0 0.375rem;
	}

	.range-marks {
		display: flex;
		justify-content: space-between;
		font-size: 0.8125rem;
		color: var(--text2);
	}

	.until-preview {
		margin-top: 1.25rem;
		padding: 1rem 1.25rem;
		background: var(--tint);
		border-radius: 10px;
		font-size: 0.875rem;
	}
</style>
