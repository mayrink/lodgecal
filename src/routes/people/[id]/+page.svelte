<script>
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, form } = $props();
	let editingSelf = $state(false);
	let addingFamily = $state(false);
	let toastKey = $state(0);

	function enhanceDone() {
		return () =>
			async ({ result, update }) => {
				await update({ reset: result.type === 'success' });
				if (result.type === 'success') {
					editingSelf = false;
					addingFamily = false;
					toastKey = Date.now();
				}
			};
	}
</script>

<div class="person-view-page">
	<div class="back-row">
		<a href="/brothers">&larr; Back to Brothers</a>
	</div>

	<div class="person-title-bar">
		<div>
			<h1>{data.person.displayName}</h1>
			<p class="page-lead">
				{#if data.userRow}Brother of the lodge{:else}Household member{/if}
				&middot; Age {data.age}
				{#if data.person.status !== 'ACTIVE'}
					&middot; <span class="pill">{data.person.status === 'DEPARTED' ? 'Departed' : 'Sleeping'}</span>
				{/if}
			</p>
		</div>
		<button type="button" class="secondary" onclick={() => (editingSelf = !editingSelf)}>
			{editingSelf ? 'Close' : 'Edit details'}
		</button>
	</div>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	{#if form?.saved}
		{#key toastKey}
			<Toast message="Record updated." duration={3500} />
		{/key}
	{/if}

	<div class="person-cards-stack">
		<section class="surface-card gold-top">
			<div class="card-split-head">
				<div>
					<h2>{data.person.full_name}</h2>
					<div class="muted" style="font-size:0.875rem">
						Born {data.person.birth_date} ({data.person.birthdayFormatted}, age {data.age})
					</div>
				</div>
				<div class="card-meta-list">
					<div><span class="muted">Birthday</span> <strong>{data.person.birthdayFormatted}</strong></div>
					<div><span class="muted">Phone</span> {data.person.phone || 'Not provided'}</div>
					<div><span class="muted">Email</span> {data.person.email || 'Not provided'}</div>
				</div>
			</div>

			{#if editingSelf}
				<form method="POST" action="?/save" class="inline-edit-box" use:enhance={enhanceDone()}>
					<input type="hidden" name="csrf" value={data.csrf} />
					<div class="field-grid">
						<div class="field">
							<label for="p-fn">Full name</label>
							<input id="p-fn" name="fullName" value={data.person.full_name} required />
						</div>
						<div class="field">
							<label for="p-bd">Birth date</label>
							<input id="p-bd" name="birthDate" type="date" value={data.person.birth_date} required />
						</div>
						<div class="field">
							<label for="p-gn">Gender</label>
							<select id="p-gn" name="gender" value={data.person.gender}>
								<option value="MALE">Male</option>
								<option value="FEMALE">Female</option>
								<option value="OTHER">Other</option>
							</select>
						</div>
						<div class="field">
							<label for="p-st">Status</label>
							<select id="p-st" name="status" value={data.person.status}>
								<option value="ACTIVE">Active</option>
								<option value="INACTIVE">Sleeping (Inactive)</option>
								<option value="DEPARTED">Departed</option>
							</select>
						</div>
						<div class="field">
							<label for="p-ph">Phone</label>
							<input id="p-ph" name="phone" value={data.person.phone ?? ''} />
						</div>
						<div class="field">
							<label for="p-em">Email</label>
							<input id="p-em" name="email" type="email" value={data.person.email ?? ''} />
						</div>
					</div>
					<div style="margin-top:1rem;display:flex;gap:0.75rem">
						<button type="submit">Save details</button>
						<button type="button" class="secondary" onclick={() => (editingSelf = false)}>Cancel</button>
					</div>
				</form>
			{/if}

			<div class="notes-area">
				<h3>Notes for the birthday card</h3>
				{#if data.knowledge.length}
					<ul class="notes-list">
						{#each data.knowledge as entry (entry.id)}
							<li class="note-row">
								<div>
									<span>{entry.body}</span>
									<small class="muted"> &middot; {entry.dateFormatted}</small>
								</div>
								<form method="POST" action="?/retireKnowledge" use:enhance={enhanceDone()}>
									<input type="hidden" name="csrf" value={data.csrf} />
									<input type="hidden" name="knowledgeId" value={entry.id} />
									<button type="submit" class="icon-button" aria-label="Remove note" title="Remove note">
										<Icon name="close" />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted" style="font-size:0.875rem">No notes yet.</p>
				{/if}

				<form method="POST" action="?/addKnowledge" class="add-note-bar" use:enhance={enhanceDone()}>
					<input type="hidden" name="csrf" value={data.csrf} />
					<input type="hidden" name="personId" value={data.person.id} />
					<input name="body" type="text" placeholder="Add a note for {data.person.full_name}..." required />
					<input name="effectiveDate" type="date" value={data.today} class="date-input" required />
					<button type="submit" class="accent">Add note</button>
				</form>
			</div>
		</section>

		<div class="family-section-header">
			<h2>Family ({data.householdMembers.length})</h2>
			{#if data.userRow}
				<button type="button" class="secondary" onclick={() => (addingFamily = !addingFamily)}>
					{addingFamily ? 'Close' : 'Add family member'}
				</button>
			{/if}
		</div>

		{#if addingFamily}
			<form method="POST" action="?/addFamilyMember" class="surface-card gold-top" use:enhance={enhanceDone()}>
				<h3>New family member</h3>
				<input type="hidden" name="csrf" value={data.csrf} />
				<div class="field-grid" style="margin-top:0.75rem">
					<div class="field">
						<label for="nf-name">Full name</label>
						<input id="nf-name" name="fullName" required />
					</div>
					<div class="field">
						<label for="nf-rel">Relation</label>
						<select id="nf-rel" name="relationChoice">
							<option value="Wife">Wife</option>
							<option value="Son">Son</option>
							<option value="Daughter">Daughter</option>
							<option value="Spouse">Spouse</option>
							<option value="Child">Child</option>
						</select>
					</div>
					<div class="field">
						<label for="nf-birth">Birth date</label>
						<input id="nf-birth" name="birthDate" type="date" required />
					</div>
					<div class="field">
						<label for="nf-phone">Phone (optional)</label>
						<input id="nf-phone" name="phone" />
					</div>
				</div>
				<div style="margin-top:1rem">
					<button type="submit">Add to household</button>
				</div>
			</form>
		{/if}

		{#each data.householdMembers as member (member.id)}
			<section class="surface-card gold-top">
				<div class="card-split-head">
					<div>
						<h2>{member.full_name}</h2>
						<div class="muted" style="font-size:0.875rem">
							{member.relLabel} &middot; Age {member.age} (born {member.birth_date})
						</div>
					</div>
					<div class="card-meta-list">
						<div><span class="muted">Birthday</span> <strong>{member.birthdayFormatted}</strong></div>
						{#if member.phone}<div><span class="muted">Phone</span> {member.phone}</div>{/if}
						{#if member.email}<div><span class="muted">Email</span> {member.email}</div>{/if}
						{#if member.membership_id}
							<form method="POST" action="?/endRelationship" style="margin-top:0.5rem" use:enhance={enhanceDone()}>
								<input type="hidden" name="csrf" value={data.csrf} />
								<input type="hidden" name="membershipId" value={member.membership_id} />
								<button type="submit" class="danger-outline" style="min-height:2.25rem;padding:0 0.75rem;font-size:0.8125rem">
									Remove from household
								</button>
							</form>
						{/if}
					</div>
				</div>

				<div class="notes-area">
					<h3>Notes for the birthday card</h3>
					{#if member.notes?.length}
						<ul class="notes-list">
							{#each member.notes as entry (entry.id)}
								<li class="note-row">
									<div>
										<span>{entry.body}</span>
										<small class="muted"> &middot; {entry.dateFormatted}</small>
									</div>
									<form method="POST" action="?/retireKnowledge" use:enhance={enhanceDone()}>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="knowledgeId" value={entry.id} />
										<button type="submit" class="icon-button" aria-label="Remove note">
											<Icon name="close" />
										</button>
									</form>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="muted" style="font-size:0.875rem">No notes yet.</p>
					{/if}

					<form method="POST" action="?/addKnowledge" class="add-note-bar" use:enhance={enhanceDone()}>
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="personId" value={member.id} />
						<input name="body" type="text" placeholder="Add a note for {member.full_name}..." required />
						<input name="effectiveDate" type="date" value={data.today} class="date-input" required />
						<button type="submit" class="accent">Add note</button>
					</form>
				</div>
			</section>
		{:else}
			<p class="muted">No family members on record for this brother.</p>
		{/each}
	</div>
</div>

<style>
	.person-view-page {
		max-width: 1000px;
	}

	.back-row {
		margin-bottom: 1rem;
		font-size: 0.9375rem;
	}

	.person-title-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.75rem;
	}

	.person-cards-stack {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.card-split-head {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		justify-content: space-between;
		align-items: flex-start;
	}

	.card-meta-list {
		font-size: 0.875rem;
		line-height: 1.65;
	}

	.inline-edit-box {
		margin-top: 1.25rem;
		padding: 1.25rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 10px;
	}

	.notes-area {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.notes-list {
		list-style: none;
		margin: 0.5rem 0 1rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: var(--tint);
		border-radius: 10px;
		padding: 0.35rem 0.5rem 0.35rem 1rem;
		font-size: 0.9375rem;
	}

	.add-note-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.add-note-bar input[type='text'] {
		flex: 1 1 16rem;
		background: var(--bg);
	}

	.add-note-bar .date-input {
		flex: 0 1 10.5rem;
		background: var(--bg);
	}

	.family-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 0.75rem;
	}
</style>
