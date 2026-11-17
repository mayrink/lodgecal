<script>
	import { enhance } from '$app/forms';
	import { Temporal } from '$lib/dates.js';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, form } = $props();
	const terms = $derived(data.lodge?.terminology ?? {});

	let editingPersonId = $state(null);
	let editingNoteId = $state(null);
	let addingMember = $state(false);
	let toastKey = $state(0);

	function enhanceSave() {
		return () =>
			async ({ result, update }) => {
				await update();
				if (result.type === 'success') {
					editingPersonId = null;
					editingNoteId = null;
					addingMember = false;
					toastKey = Temporal.Now.instant().epochMilliseconds;
				}
			};
	}

	function firstName(fullName) {
		return (fullName || '').trim().split(/\s+/)[0] || 'them';
	}

	function placeholderFor(member) {
		if (member.isSelf) return 'e.g. Plays golf every Sunday, collects vinyl records';
		if (member.relationship === 'SPOUSE') return 'e.g. Teaches piano, grows orchids';
		return 'e.g. Draws manga, just joined the school robotics team';
	}
</script>

<div class="family-page">
	<h1>My family</h1>
	<p class="page-lead">
		Only you and the lodge officers can see this page. The notes you add are used to make each
		birthday card personal.
	</p>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	{#if form?.saved}
		{#key toastKey}
			<Toast message="Saved to the lodge register." duration={4000} />
		{/key}
	{/if}

	<div class="family-cards">
		{#each data.members as member (member.id)}
			<section id="person-{member.id}" class="surface-card gold-top member-card">
				<div class="member-head">
					<div class="member-identity">
						<h2>{member.full_name}</h2>
						<div class="member-rel">
							{member.relLabel}{#if member.isSelf && data.isAdmin && member.age != null}, age {member.age}{/if}
						</div>
					</div>

					<div class="member-meta-wrap">
						<div class="member-meta">
							<div><span class="muted">Birthday</span> <strong>{member.birthdayFormatted}</strong></div>
							{#if member.phone}
								<div><span class="muted">Phone</span> {member.phone}</div>
							{/if}
							{#if member.email}
								<div><span class="muted">Email</span> {member.email}</div>
							{/if}
						</div>
						{#if member.isSelf || !member.hasAccount}
							<button
								type="button"
								class="secondary edit-person-btn"
								onclick={() =>
									(editingPersonId = editingPersonId === member.id ? null : member.id)}
							>
								{editingPersonId === member.id ? 'Close' : 'Edit details'}
							</button>
						{/if}
					</div>
				</div>

				{#if editingPersonId === member.id}
					<form
						method="POST"
						action={member.isSelf ? '?/saveSelf' : '?/saveMember'}
						class="inline-edit-panel"
						use:enhance={enhanceSave()}
					>
						<input type="hidden" name="csrf" value={data.csrf} />
						{#if !member.isSelf}
							<input type="hidden" name="personId" value={member.id} />
						{/if}
						<div class="field-grid">
							<div class="field">
								<label for="fn-{member.id}">Full name</label>
								<input
									id="fn-{member.id}"
									name="fullName"
									value={member.full_name}
									required
									autocomplete="name"
								/>
							</div>
							<div class="field">
								<label for="bd-{member.id}">Birth date</label>
								<input
									id="bd-{member.id}"
									name="birthDate"
									type="date"
									value={member.birth_date}
									max={data.today}
									required
								/>
							</div>
							<div class="field">
								<label for="gn-{member.id}">Gender</label>
								<select id="gn-{member.id}" name="gender" value={member.gender} required>
									<option value="MALE">Male</option>
									<option value="FEMALE">Female</option>
									<option value="OTHER">Other</option>
								</select>
							</div>
							<div class="field">
								<label for="ph-{member.id}">Phone</label>
								<input
									id="ph-{member.id}"
									name="phone"
									type="tel"
									value={member.phone ?? ''}
									autocomplete="tel"
								/>
							</div>
							<div class="field field-full">
								<label for="em-{member.id}"
									>Email {member.isSelf ? '(used to sign in)' : '(optional)'}</label
								>
								<input
									id="em-{member.id}"
									name="email"
									type="email"
									value={member.email ?? ''}
									required={member.isSelf}
									autocomplete="email"
								/>
							</div>
						</div>
						<div class="inline-edit-actions">
							<button type="submit">Save details</button>
							<button
								type="button"
								class="secondary"
								onclick={() => (editingPersonId = null)}
							>
								Cancel
							</button>
						</div>
					</form>
				{/if}

				<div class="notes-block">
					<h3>Notes for the birthday card</h3>
					<p class="notes-hint">
						What does {firstName(member.full_name)} love, or what did they just achieve?
					</p>

					{#if member.notes?.length}
						<ul class="notes-list">
							{#each member.notes as note (note.id)}
								<li class="note-item">
									{#if editingNoteId === note.id}
										<form method="POST" action="?/editNote" class="note-edit-form" use:enhance={enhanceSave()}>
											<input type="hidden" name="csrf" value={data.csrf} />
											<input type="hidden" name="knowledgeId" value={note.id} />
											<input
												type="text"
												name="body"
												value={note.body}
												required
												aria-label="Note text"
											/>
											<input
												type="date"
												name="effectiveDate"
												value={note.effectiveDate}
												required
												aria-label="Note date"
												class="note-date-input"
											/>
											<button type="submit">Save</button>
											<button
												type="button"
												class="secondary"
												onclick={() => (editingNoteId = null)}
											>
												Cancel
											</button>
										</form>
									{:else}
										<div class="note-content">
											<span class="note-text">{note.body}</span>
											<time class="note-date-badge" datetime={note.effectiveDate}
												>{note.dateFormatted}</time
											>
										</div>
										<div class="note-actions">
											<button
												type="button"
												class="note-icon-btn"
												onclick={() => (editingNoteId = note.id)}
												aria-label="Edit note: {note.body}"
												title="Edit note"
											>
												<Icon name="edit" />
											</button>
											<form method="POST" action="?/removeNote" use:enhance>
												<input type="hidden" name="csrf" value={data.csrf} />
												<input type="hidden" name="knowledgeId" value={note.id} />
												<button
													type="submit"
													class="note-icon-btn"
													aria-label="Remove note: {note.body}"
													title="Remove note"
												>
													<Icon name="close" />
												</button>
											</form>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<div class="empty-notes-box">No notes yet. A line or two is plenty.</div>
					{/if}

					<form
						method="POST"
						action="?/addNote"
						class="add-note-form"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update({ reset: result.type === 'success' });
							};
						}}
					>
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="personId" value={member.id} />
						<div class="add-note-input-wrap">
							<label class="sr-only" for="new-note-{member.id}"
								>New note for {member.full_name}</label
							>
							<input
								id="new-note-{member.id}"
								name="body"
								type="text"
								placeholder={placeholderFor(member)}
								required
							/>
						</div>
						<div class="add-note-date-wrap">
							<label class="sr-only" for="new-note-date-{member.id}">Date</label>
							<input
								id="new-note-date-{member.id}"
								name="effectiveDate"
								type="date"
								value={data.today}
								title="Date of note"
								required
							/>
						</div>
						<button type="submit" class="accent">Add note</button>
					</form>
				</div>
			</section>
		{/each}
	</div>

	<div class="gold-callout family-bottom-bar">
		<div class="bottom-bar-text">
			<div class="bottom-bar-title">Add a spouse or child to your household</div>
			<div>
				You can add your spouse and children directly below. Removing a family member from the
				register is handled by the lodge administrator.
			</div>
		</div>
		<button
			type="button"
			class="secondary bottom-bar-btn"
			onclick={() => (addingMember = !addingMember)}
		>
			{addingMember ? 'Close' : 'Add family member'}
		</button>
	</div>

	{#if addingMember}
		<form method="POST" action="?/addMember" class="surface-card gold-top add-member-card" use:enhance={enhanceSave()}>
			<h2>Add family member</h2>
			<input type="hidden" name="csrf" value={data.csrf} />
			<div class="field-grid">
				<div class="field">
					<label for="add-rel">Relationship</label>
					<select id="add-rel" name="relationship" required>
						{#if !data.hasSpouse}
							<option value="SPOUSE">{terms.spouse || 'Spouse'}</option>
						{/if}
						<option value="CHILD">{terms.child || 'Child'}</option>
					</select>
				</div>
				<div class="field">
					<label for="add-gender">Gender</label>
					<select id="add-gender" name="gender" required>
						<option value="">Select</option>
						<option value="FEMALE">Female</option>
						<option value="MALE">Male</option>
						<option value="OTHER">Other</option>
					</select>
				</div>
				<div class="field">
					<label for="add-name">Full name</label>
					<input id="add-name" name="fullName" required />
				</div>
				<div class="field">
					<label for="add-birth">Birth date</label>
					<input id="add-birth" name="birthDate" type="date" max={data.today} required />
				</div>
				<div class="field">
					<label for="add-phone">Phone (optional)</label>
					<input id="add-phone" name="phone" type="tel" />
				</div>
				<div class="field">
					<label for="add-email">Email (optional)</label>
					<input id="add-email" name="email" type="email" />
				</div>
			</div>
			<div class="inline-edit-actions">
				<button type="submit">Add family member</button>
				<button type="button" class="secondary" onclick={() => (addingMember = false)}
					>Cancel</button
				>
			</div>
		</form>
	{/if}
</div>

<style>
	.family-page {
		max-width: 1000px;
	}

	.family-cards {
		margin-top: 2.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.member-card {
		padding: 1.75rem 2rem;
	}

	.member-head {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		justify-content: space-between;
		align-items: flex-start;
	}

	.member-identity h2 {
		font-size: 1.5rem;
		margin: 0;
	}

	.member-rel {
		font-size: 0.875rem;
		color: var(--text2);
		margin-top: 0.125rem;
	}

	.member-meta-wrap {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 1rem 1.5rem;
	}

	.member-meta {
		font-size: 0.875rem;
		line-height: 1.7;
	}

	.edit-person-btn {
		min-height: 2.5rem;
		padding: 0 0.95rem;
		font-size: 0.875rem;
	}

	.inline-edit-panel {
		margin-top: 1.25rem;
		padding: 1.25rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 10px;
	}

	.inline-edit-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.notes-block {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.notes-block h3 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
	}

	.notes-hint {
		margin: 0 0 0.875rem;
		font-size: 0.875rem;
		color: var(--text2);
	}

	.notes-list {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: var(--tint);
		border-radius: 10px;
		padding: 0.375rem 0.5rem 0.375rem 1rem;
		font-size: 0.9375rem;
		line-height: 1.4;
	}

	.note-content {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.note-date-badge {
		font-size: 0.78rem;
		color: var(--text2);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.note-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: none;
	}

	.note-icon-btn {
		width: 2.5rem;
		min-width: 2.5rem;
		height: 2.5rem;
		min-height: 2.5rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--text2);
		border-radius: var(--radius);
	}

	.note-icon-btn:hover {
		background: rgba(0, 0, 0, 0.06);
		color: var(--text);
	}

	.note-edit-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
		padding: 0.35rem 0;
	}

	.note-edit-form input[type='text'] {
		flex: 1 1 14rem;
	}

	.note-edit-form .note-date-input {
		flex: 0 1 10rem;
	}

	.empty-notes-box {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--text2);
		border: 1px dashed var(--border);
		border-radius: 10px;
		padding: 0.875rem 1rem;
	}

	.add-note-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.add-note-input-wrap {
		flex: 1 1 16rem;
	}

	.add-note-input-wrap input,
	.add-note-date-wrap input {
		background: var(--bg);
	}

	.add-note-date-wrap {
		flex: 0 1 10.5rem;
	}

	.family-bottom-bar {
		margin-top: 2.25rem;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
	}

	.bottom-bar-text {
		flex: 1 1 22rem;
	}

	.bottom-bar-title {
		font-weight: 600;
		margin-bottom: 0.125rem;
	}

	.bottom-bar-btn {
		border-color: var(--text);
	}

	.add-member-card {
		margin-top: 1.25rem;
	}

	.add-member-card h2 {
		margin: 0 0 1rem;
	}

	@media (max-width: 640px) {
		.member-card {
			padding: 1.25rem;
		}
	}
</style>
