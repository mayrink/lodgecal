<script>
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { sortableTable } from '$lib/sortable-table.js';
	import { Temporal, addWeeks, formatDateLongYear } from '$lib/dates.js';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, form } = $props();

	let activeTab = $state('members');
	let newBrotherOpen = $state(false);
	let openNotePersonId = $state(null);
	let editTarget = $state(null);
	let deleteTarget = $state(null);
	let deleteDialog;
	let showAddFamilyMemberInPanel = $state(false);
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
					newEventOpen = false;
					editEventId = null;
					toastKey = Temporal.Now.instant().epochMilliseconds;
					onDone();
				}
			};
	}

	function openEditPane(person) {
		editTarget = person;
		showAddFamilyMemberInPanel = false;
	}

	function closeEditPane() {
		editTarget = null;
		showAddFamilyMemberInPanel = false;
	}

	function openDeleteModal(person) {
		deleteTarget = person;
		deleteDialog?.showModal();
	}

	function closeDeleteModal() {
		deleteDialog?.close();
		deleteTarget = null;
	}

	function toggleNoteDrawer(personId) {
		openNotePersonId = openNotePersonId === personId ? null : personId;
	}

	function onKeydown(event) {
		if (event.key === 'Escape' && editTarget) {
			closeEditPane();
		}
	}

	const peopleList = $derived(data.people ?? []);
	const activePeopleCount = $derived(
		peopleList.filter((p) => !p.sleeping).length
	);
	const sleepingPeopleCount = $derived(
		peopleList.filter((p) => p.sleeping).length
	);

	const currentEditTarget = $derived(
		editTarget ? (peopleList.find((p) => p.id === editTarget.id) ?? editTarget) : null
	);

	const filteredPeople = $derived.by(() => {
		const q = memberQuery.trim().toLowerCase();
		if (!q) return peopleList;
		return peopleList.filter(
			(p) =>
				p.displayName.toLowerCase().includes(q) ||
				p.fullName.toLowerCase().includes(q) ||
				p.email.toLowerCase().includes(q) ||
				p.phone.toLowerCase().includes(q) ||
				(p.householdBrotherName && p.householdBrotherName.toLowerCase().includes(q))
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

<svelte:window onkeydown={onKeydown} />

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
						{activePeopleCount} active, {sleepingPeopleCount} sleeping.
					</p>
					<input
						type="search"
						class="admin-search"
						bind:value={memberQuery}
						placeholder="Filter by name, email, phone or brother..."
						aria-label="Filter people"
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

			<div class="table-wrap admin-table-wrap">
				<table use:sortableTable>
					<thead>
						<tr>
							<th scope="col" class="role-column" aria-label="Role">Role</th>
							<th scope="col">Name</th>
							<th scope="col">Details</th>
							<th scope="col" class="actions-column">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredPeople as person (person.id)}
							<tr
								class="admin-person-row"
								class:is-sleeping={person.sleeping}
							>
								<td data-sort-value={person.categoryOrder} class="role-cell">
									<span
										class="role-dot dot-{person.category.toLowerCase()}"
										title={person.categoryLabel}
										aria-label={person.categoryLabel}
									></span>
								</td>
								<td data-sort-value={person.fullName} class="name-column">
									<div class="name-cell">
										<span class="person-name" class:sleeping={person.sleeping}>
											{person.displayName}
										</span>
										{#if person.role === 'ADMIN'}
											<span class="pill tint">Superadmin</span>
										{/if}
										{#if person.status === 'DEPARTED'}
											<span class="pill">Departed</span>
										{/if}
									</div>
								</td>
								<td data-sort-value={person.birthMonthDay} class="details-column">
									<div class="meta-cell">
										{#if person.category === 'SPOUSE' && person.householdBrotherName}
											<div class="meta-top-line">
												<span class="household-badge">{person.relationLabel || 'Wife'} of {person.householdBrotherName}</span>
											</div>
											<div class="meta-sub-line">
												{#if person.email}<span>{person.email}</span><span class="sep">&middot;</span>{/if}
												{#if person.phone}<span>{person.phone}</span><span class="sep">&middot;</span>{/if}
												<span class="bday-text">born {person.birthShort} (age {person.age})</span>
											</div>
										{:else if person.category === 'CHILD' && person.householdBrotherName}
											<div class="meta-top-line">
												<span class="household-badge">{person.relationLabel || (person.gender === 'FEMALE' ? 'Daughter' : person.gender === 'MALE' ? 'Son' : 'Child')} of {person.householdBrotherName}</span>
											</div>
											<div class="meta-sub-line">
												{#if person.email}<span>{person.email}</span><span class="sep">&middot;</span>{/if}
												{#if person.phone}<span>{person.phone}</span><span class="sep">&middot;</span>{/if}
												<span class="bday-text">born {person.birthShort} (age {person.age})</span>
											</div>
										{:else}
											<div class="meta-top-line">
												{#if person.email}<span>{person.email}</span>{/if}
												{#if person.email && person.phone}<span class="sep">&middot;</span>{/if}
												{#if person.phone}<span>{person.phone}</span>{/if}
												{#if !person.email && !person.phone}<span class="muted">No contact info</span>{/if}
											</div>
											<div class="meta-sub-line">
												<span class="bday-text">born {person.birthShort} (age {person.age})</span>
											</div>
										{/if}
									</div>
								</td>
								<td class="row-actions">
									<div class="action-icons">
										<a
											class="icon-button"
											href="/people/{person.personId}"
											aria-label="View {person.fullName}"
											title="View profile"
										>
											<Icon name="eye" />
										</a>
										<button
											type="button"
											class="icon-button"
											onclick={() => openEditPane(person)}
											aria-label="Edit {person.fullName}"
											title="Edit"
										>
											<Icon name="edit" />
										</button>
										<button
											type="button"
											class="icon-button"
											class:active-note-btn={openNotePersonId === person.personId}
											onclick={() => toggleNoteDrawer(person.personId)}
											aria-label="Birthday notes for {person.fullName}"
											title="Birthday notes ({person.knowledge.length})"
											aria-expanded={openNotePersonId === person.personId}
										>
											<Icon name="tag" />
										</button>
										{#if person.category === 'BROTHER'}
											<form method="POST" action="?/toggleSleep" use:enhance>
												<input type="hidden" name="csrf" value={data.csrf} />
												<input type="hidden" name="userId" value={person.userId} />
												<button
													type="submit"
													class="icon-button sleep-btn"
													class:is-sleeping={person.sleeping}
													aria-pressed={person.sleeping}
													aria-label={person.sleeping ? `Wake ${person.fullName}` : `Mark ${person.fullName} sleeping`}
													title={person.sleeping ? 'Sleeping (click to reactivate)' : 'Active (click to mark sleeping)'}
												>
													<Icon name="moon" />
												</button>
											</form>
										{:else}
											<span class="icon-placeholder" aria-hidden="true"></span>
										{/if}
										<button
											type="button"
											class="icon-button danger-icon-btn"
											onclick={() => openDeleteModal(person)}
											aria-label="Delete {person.fullName}"
											title="Delete"
										>
											<Icon name="trash" />
										</button>
									</div>
								</td>
							</tr>

							{#if openNotePersonId === person.personId}
								<tr class="inline-note-row">
									<td colspan="4">
										<div class="inline-note-drawer">
											<div class="note-drawer-header">
												<strong>Birthday notes for {person.displayName}</strong>
												<button
													type="button"
													class="tag-close-btn"
													onclick={() => (openNotePersonId = null)}
													aria-label="Close notes"
												>&times;</button>
											</div>
											{#if person.knowledge.length}
												<div class="drawer-notes-pills">
													{#each person.knowledge as k (k.id)}
														<span class="drawer-note-tag">
															<span>{k.body}</span>
															<small class="muted">({k.dateFormatted})</small>
															<form method="POST" action="?/removeNote" use:enhance>
																<input type="hidden" name="csrf" value={data.csrf} />
																<input type="hidden" name="knowledgeId" value={k.id} />
																<button type="submit" class="tag-remove-btn" aria-label="Remove note">&times;</button>
															</form>
														</span>
													{/each}
												</div>
											{:else}
												<p class="muted empty-note-hint">No birthday notes recorded yet.</p>
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
												<input type="hidden" name="personId" value={person.personId} />
												<input
													name="body"
													type="text"
													placeholder="Add a birthday note for {person.fullName}..."
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
									</td>
								</tr>
							{/if}
						{:else}
							<tr>
								<td colspan="4" class="empty-people">
									No person matches that filter.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
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

{#if currentEditTarget}
	<button
		type="button"
		class="slide-scrim"
		aria-label="Close edit pane"
		onclick={closeEditPane}
		transition:fade={{ duration: 140 }}
	></button>
	<aside
		class="slide-pane"
		aria-label="Edit {currentEditTarget.displayName}"
		transition:fly={{ x: 380, duration: 180 }}
	>
		<div class="pane-header">
			<div>
				<h2>{currentEditTarget.category === 'BROTHER' ? 'Edit brother' : 'Edit family member'}</h2>
				<p class="muted" style="margin:0.15rem 0 0;font-size:0.875rem">{currentEditTarget.displayName}</p>
			</div>
			<button
				type="button"
				class="icon-button"
				onclick={closeEditPane}
				aria-label="Close pane"
				title="Close"
			>
				<Icon name="close" />
			</button>
		</div>

		{#if currentEditTarget.category === 'BROTHER'}
			<form
				method="POST"
				action="?/updateBrother"
				class="stack pane-form"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeEditPane();
							toastKey = Temporal.Now.instant().epochMilliseconds;
						}
					};
				}}
			>
				<input type="hidden" name="csrf" value={data.csrf} />
				<input type="hidden" name="userId" value={currentEditTarget.userId} />

				<div>
					<label for="eb-name">Full name</label>
					<input id="eb-name" name="fullName" value={currentEditTarget.fullName} required />
				</div>
				<div>
					<label for="eb-email">Email</label>
					<input id="eb-email" name="email" type="email" value={currentEditTarget.email} required />
				</div>
				<div>
					<label for="eb-phone">Phone</label>
					<input id="eb-phone" name="phone" type="tel" value={currentEditTarget.phone} />
				</div>
				<div class="field-grid">
					<div class="field">
						<label for="eb-birth">Birth date</label>
						<input id="eb-birth" name="birthDate" type="date" value={currentEditTarget.birthDate} max={data.today} required />
					</div>
					<div class="field">
						<label for="eb-gender">Gender</label>
						<select id="eb-gender" name="gender" value={currentEditTarget.gender}>
							<option value="MALE">Male</option>
							<option value="FEMALE">Female</option>
							<option value="OTHER">Other</option>
						</select>
					</div>
					<div class="field">
						<label for="eb-role">Role</label>
						<select id="eb-role" name="role" value={currentEditTarget.role}>
							<option value="USER">USER</option>
							<option value="ADMIN">ADMIN</option>
						</select>
					</div>
					<div class="field">
						<label for="eb-status">Status</label>
						<select id="eb-status" name="status" value={currentEditTarget.status}>
							<option value="ACTIVE">Active</option>
							<option value="INACTIVE">Sleeping (Inactive)</option>
							<option value="DEPARTED">Departed</option>
						</select>
					</div>
				</div>

				<div class="pane-footer">
					<button type="button" class="secondary" onclick={closeEditPane}>Cancel</button>
					<button type="submit">Save brother</button>
				</div>
			</form>

			<div class="pane-section">
				<div class="pane-section-header">
					<h3>Household members ({currentEditTarget.family.length})</h3>
					<button
						type="button"
						class="secondary small-btn"
						onclick={() => (showAddFamilyMemberInPanel = !showAddFamilyMemberInPanel)}
					>
						{showAddFamilyMemberInPanel ? 'Cancel' : '+ Add family member'}
					</button>
				</div>

				{#if showAddFamilyMemberInPanel}
					<form
						method="POST"
						action="?/addFamilyMember"
						class="stack inline-add-family"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === 'success') {
									showAddFamilyMemberInPanel = false;
									toastKey = Temporal.Now.instant().epochMilliseconds;
								}
							};
						}}
					>
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="userId" value={currentEditTarget.userId} />
						<div>
							<label class="muted-label" for="afm-name">Full name</label>
							<input id="afm-name" name="fullName" required placeholder="Full name" />
						</div>
						<div class="field-grid">
							<div class="field">
								<label class="muted-label" for="afm-relation">Relation</label>
								<select id="afm-relation" name="relationChoice">
									<option value="Wife">Wife</option>
									<option value="Son">Son</option>
									<option value="Daughter">Daughter</option>
									<option value="Spouse">Spouse</option>
									<option value="Child">Child</option>
								</select>
							</div>
							<div class="field">
								<label class="muted-label" for="afm-birth">Birth date</label>
								<input id="afm-birth" name="birthDate" type="date" max={data.today} required />
							</div>
						</div>
						<div style="display:flex;justify-content:flex-end;margin-top:0.5rem">
							<button type="submit" class="small-btn">Add to household</button>
						</div>
					</form>
				{/if}

				{#if currentEditTarget.family.length}
					<ul class="pane-fam-list">
						{#each currentEditTarget.family as f (f.membershipId)}
							<li class="pane-fam-item">
								<div>
									<strong>{f.fullName}</strong>
									<span class="muted"> ({f.relationLabel})</span>
									<div class="muted" style="font-size:0.8125rem">
										born {f.birthShort} (age {f.age})
									</div>
								</div>
								<form method="POST" action="?/removeFamilyMember" use:enhance>
									<input type="hidden" name="csrf" value={data.csrf} />
									<input type="hidden" name="membershipId" value={f.membershipId} />
									<button type="submit" class="danger-outline small-btn">Remove</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted" style="font-size:0.875rem;margin:0.5rem 0 0">No family members registered yet.</p>
				{/if}
			</div>

			<div class="pane-section password-reset-strip">
				<span class="muted">
					Need to reset {currentEditTarget.displayName}'s sign-in password?
				</span>
				<form method="POST" action="?/resetPassword" use:enhance>
					<input type="hidden" name="csrf" value={data.csrf} />
					<input type="hidden" name="userId" value={currentEditTarget.userId} />
					<button type="submit" class="secondary action-btn">
						Issue temporary password
					</button>
				</form>
			</div>
		{:else}
			<form
				method="POST"
				action="?/updateFamilyMember"
				class="stack pane-form"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeEditPane();
							toastKey = Temporal.Now.instant().epochMilliseconds;
						}
					};
				}}
			>
				<input type="hidden" name="csrf" value={data.csrf} />
				<input type="hidden" name="personId" value={currentEditTarget.personId} />

				{#if currentEditTarget.householdBrotherName}
					<div class="gold-callout" style="padding:0.75rem 1rem;font-size:0.875rem;margin-bottom:1rem">
						Belongs to the household of <strong>{currentEditTarget.householdBrotherName}</strong>.
					</div>
				{/if}

				<div>
					<label for="ef-name">Full name</label>
					<input id="ef-name" name="fullName" value={currentEditTarget.fullName} required />
				</div>
				<div class="field-grid">
					<div class="field">
						<label for="ef-birth">Birth date</label>
						<input id="ef-birth" name="birthDate" type="date" value={currentEditTarget.birthDate} max={data.today} required />
					</div>
					<div class="field">
						<label for="ef-gender">Gender</label>
						<select id="ef-gender" name="gender" value={currentEditTarget.gender}>
							<option value="FEMALE">Female</option>
							<option value="MALE">Male</option>
							<option value="OTHER">Other</option>
						</select>
					</div>
				</div>
				<div>
					<label for="ef-phone">Phone</label>
					<input id="ef-phone" name="phone" type="tel" value={currentEditTarget.phone} />
				</div>
				<div>
					<label for="ef-email">Email</label>
					<input id="ef-email" name="email" type="email" value={currentEditTarget.email} />
				</div>

				<div class="pane-footer">
					<button type="button" class="secondary" onclick={closeEditPane}>Cancel</button>
					<button type="submit">Save changes</button>
				</div>
			</form>
		{/if}
	</aside>
{/if}

<dialog
	bind:this={deleteDialog}
	class="modal-dialog purge-modal"
	onclose={() => (deleteTarget = null)}
>
	<div class="modal-heading">
		<h2>{deleteTarget?.category === 'BROTHER' ? 'Delete brother?' : 'Remove family member?'}</h2>
		<button
			type="button"
			class="icon-button"
			onclick={closeDeleteModal}
			aria-label="Cancel and close"
		>
			<Icon name="close" />
		</button>
	</div>

	{#if deleteTarget}
		{#if deleteTarget.category === 'BROTHER'}
			<div class="purge-warning-box">
				<p style="margin:0 0 0.75rem">
					You are about to delete <strong>{deleteTarget.displayName}</strong>.
				</p>
				<p style="margin:0">
					His login account will be removed.
					{#if deleteTarget.family?.length}
						His {deleteTarget.family.length} family {deleteTarget.family.length === 1 ? 'member remains' : 'members remain'} on record.
					{/if}
					If he is simply taking leave from lodge activity, mark him as <strong>sleeping</strong> instead.
				</p>
			</div>

			<form
				method="POST"
				action="?/deleteBrother"
				class="stack"
				style="margin-top:1.25rem"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeDeleteModal();
							toastKey = Temporal.Now.instant().epochMilliseconds;
						}
					};
				}}
			>
				<input type="hidden" name="csrf" value={data.csrf} />
				<input type="hidden" name="userId" value={deleteTarget.userId} />

				<div class="modal-actions">
					<button type="button" class="secondary" onclick={closeDeleteModal}>Cancel</button>
					<button type="submit" class="danger">Delete brother</button>
				</div>
			</form>
		{:else}
			<div class="purge-warning-box">
				<p style="margin:0">
					Remove <strong>{deleteTarget.fullName}</strong> from the household of
					<strong>{deleteTarget.householdBrotherName}</strong>?
				</p>
			</div>

			<form
				method="POST"
				action="?/removeFamilyMember"
				class="stack"
				style="margin-top:1.25rem"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							closeDeleteModal();
							toastKey = Temporal.Now.instant().epochMilliseconds;
						}
					};
				}}
			>
				<input type="hidden" name="csrf" value={data.csrf} />
				<input type="hidden" name="membershipId" value={deleteTarget.membershipId} />

				<div class="modal-actions">
					<button type="button" class="secondary" onclick={closeDeleteModal}>Cancel</button>
					<button type="submit" class="danger">Remove member</button>
				</div>
			</form>
		{/if}
	{/if}
</dialog>

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

	/* Admin Registry Table & Role Dots */
	.admin-table-wrap {
		margin-top: 1.25rem;
	}

	.role-column {
		width: 3.5rem;
		text-align: center;
	}

	.role-cell {
		text-align: center;
		vertical-align: middle;
		padding: 0.75rem 0.5rem;
	}

	.role-dot {
		display: inline-block;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		vertical-align: middle;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.role-dot.dot-brother {
		background-color: #2563EB;
	}

	.role-dot.dot-spouse {
		background-color: #A855F7;
	}

	.role-dot.dot-child {
		background-color: #EAB308;
	}

	.admin-person-row.is-sleeping {
		opacity: 0.62;
	}

	.admin-person-row.is-sleeping .person-name {
		color: var(--text2);
	}

	.name-column {
		white-space: nowrap;
	}

	.details-column {
		max-width: 20rem;
	}

	.name-cell {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.person-name {
		font-weight: 600;
		font-size: 1rem;
		white-space: nowrap;
	}

	.meta-cell {
		font-size: 0.875rem;
		color: var(--text2);
		line-height: 1.4;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.meta-top-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.meta-sub-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8125rem;
		color: var(--text2);
	}

	.household-badge {
		color: var(--accent);
		font-weight: 500;
	}

	.sep {
		color: var(--border);
	}

	.bday-text {
		white-space: nowrap;
	}

	.action-icons {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.icon-placeholder {
		display: inline-block;
		width: 2.75rem;
		min-width: 2.75rem;
		height: 2.75rem;
	}

	.sleep-btn.is-sleeping {
		background: var(--goldtint);
		border-color: var(--accent);
		color: var(--text);
	}

	.active-note-btn {
		background: var(--tint);
		border-color: var(--border);
		color: var(--text);
	}

	.danger-icon-btn {
		color: var(--warn);
	}

	.danger-icon-btn:hover {
		background: var(--warntint);
		border-color: var(--warn);
		color: var(--warn);
	}

	.inline-note-row td {
		padding: 0;
		background: var(--tint);
		border-bottom: 1px solid var(--border);
	}

	.inline-note-drawer {
		padding: 1rem 1.5rem 1.25rem;
	}

	.note-drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.tag-close-btn {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: var(--text2);
		line-height: 1;
		padding: 0.2rem 0.5rem;
	}

	.tag-close-btn:hover {
		color: var(--text);
	}

	.empty-note-hint {
		font-size: 0.8125rem;
		margin: 0.25rem 0 0.5rem;
		color: var(--text2);
	}

	.empty-people {
		padding: 2rem 1.5rem;
		color: var(--text2);
		text-align: center;
	}

	/* Slide Panel & Modal Extras */
	.pane-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 1.25rem;
	}

	.pane-header h2 {
		margin: 0;
	}

	.pane-form {
		flex: 1;
	}

	.pane-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.pane-section {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.pane-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.pane-section-header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.pane-fam-list {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pane-fam-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.inline-add-family {
		padding: 0.875rem 1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin-bottom: 0.75rem;
	}

	.purge-warning-box {
		margin-top: 1rem;
		padding: 1rem 1.25rem;
		background: var(--warntint);
		border: 1px solid var(--warn);
		border-radius: 10px;
		font-size: 0.9375rem;
		line-height: 1.55;
	}
</style>
