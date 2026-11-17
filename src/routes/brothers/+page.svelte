<script>
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { sortableTable } from '$lib/sortable-table.js';
	import { Temporal } from '$lib/dates.js';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, form } = $props();

	let searchQuery = $state('');
	let showSleeping = $state(true);
	let editTarget = $state(null);
	let deleteTarget = $state(null);
	let deleteTypedName = $state('');
	let deleteDialog;
	let toastKey = $state(0);

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

	function openEditPane(row) {
		editTarget = row;
	}

	function closeEditPane() {
		editTarget = null;
	}

	function openDeleteModal(row) {
		deleteTarget = row;
		deleteTypedName = '';
		deleteDialog?.showModal();
	}

	function closeDeleteModal() {
		deleteDialog?.close();
		deleteTarget = null;
		deleteTypedName = '';
	}

	function onKeydown(event) {
		if (event.key === 'Escape' && editTarget) {
			closeEditPane();
		}
	}

	const canConfirmDelete = $derived(
		Boolean(deleteTarget && deleteTypedName.trim() === deleteTarget.fullName)
	);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="brothers-page">
	<h1>Brothers</h1>
	<p class="page-lead">
		The brothers of our lodge. Families are private to each brother and the lodge officers.
	</p>

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	{#if form?.saved}
		{#key toastKey}
			<Toast message="Brother record updated." duration={3500} />
		{/key}
	{/if}

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

	<div class="table-wrap brothers-table-wrap">
		<table use:sortableTable>
			<thead>
				<tr>
					<th scope="col">Name</th>
					<th scope="col">Birthday</th>
					<th scope="col">Contact</th>
					{#if data.isAdmin}
						<th scope="col" class="actions-column">Actions</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.id)}
					<tr class:sleeping-row={row.sleeping}>
						<td data-sort-value={row.fullName}>
							<div class="name-cell">
								<span class="brother-name" class:sleeping={row.sleeping}>{row.name}</span>
								{#if row.you}
									<span class="pill you">You</span>
								{/if}
								{#if data.isAdmin && row.sleeping}
									<span class="pill">{row.statusLabel}</span>
								{/if}
							</div>
						</td>
						<td data-sort-value={row.birthMonthDay} class="bday-cell">{row.birthday}</td>
						<td>
							<div class="contact-cell">
								{#if row.phone}<div>{row.phone}</div>{/if}
								{#if row.email}<div>{row.email}</div>{/if}
							</div>
						</td>
						{#if data.isAdmin}
							<td class="row-actions">
								<div class="action-icons">
									<a
										class="icon-button"
										href="/people/{row.id}"
										aria-label="View {row.name}"
										title="View brother and family"
									>
										<Icon name="eye" />
									</a>
									<button
										type="button"
										class="icon-button"
										onclick={() => openEditPane(row)}
										aria-label="Edit {row.name}"
										title="Edit brother"
									>
										<Icon name="edit" />
									</button>
									<form
										method="POST"
										action="?/toggleSleep"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') {
													if (!row.sleeping) showSleeping = true;
													toastKey = Temporal.Now.instant().epochMilliseconds;
												}
											};
										}}
									>
										<input type="hidden" name="csrf" value={data.csrf} />
										<input type="hidden" name="userId" value={row.userId} />
										<button
											type="submit"
											class="icon-button sleep-btn"
											class:is-sleeping={row.sleeping}
											aria-pressed={row.sleeping}
											aria-label={row.sleeping
												? `Mark ${row.name} active (wake from sleep)`
												: `Mark ${row.name} as sleeping`}
											title={row.sleeping ? 'Sleeping (click to reactivate)' : 'Active (click to mark sleeping)'}
										>
											<Icon name="moon" />
										</button>
									</form>
									<button
										type="button"
										class="icon-button danger-icon-btn"
										onclick={() => openDeleteModal(row)}
										aria-label="Delete {row.name}"
										title="Delete brother and family"
									>
										<Icon name="trash" />
									</button>
								</div>
							</td>
						{/if}
					</tr>
				{:else}
					<tr>
						<td colspan={data.isAdmin ? 4 : 3} class="empty-brothers">
							No brother matches that name.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="brothers-count">
		Showing {rows.length} {rows.length === 1 ? 'brother' : 'brothers'}.
	</p>
</div>

{#if editTarget}
	<button
		type="button"
		class="slide-scrim"
		aria-label="Close edit pane"
		onclick={closeEditPane}
		transition:fade={{ duration: 140 }}
	></button>
	<aside
		class="slide-pane"
		aria-label="Edit {editTarget.name}"
		transition:fly={{ x: 360, duration: 180 }}
	>
		<div class="pane-header">
			<div>
				<h2>Edit brother</h2>
				<p class="muted" style="margin:0.15rem 0 0;font-size:0.875rem">{editTarget.name}</p>
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
			<input type="hidden" name="userId" value={editTarget.userId} />

			<div>
				<label for="pane-fullName">Full name</label>
				<input id="pane-fullName" name="fullName" value={editTarget.fullName} required />
			</div>

			<div>
				<label for="pane-email">Email (login)</label>
				<input id="pane-email" name="email" type="email" value={editTarget.email} required />
			</div>

			<div>
				<label for="pane-phone">Phone</label>
				<input id="pane-phone" name="phone" type="tel" value={editTarget.phone} />
			</div>

			<div class="field-grid">
				<div class="field">
					<label for="pane-birth">Birth date</label>
					<input
						id="pane-birth"
						name="birthDate"
						type="date"
						value={editTarget.birthDate}
						max={data.today}
						required
					/>
				</div>
				<div class="field">
					<label for="pane-gender">Gender</label>
					<select id="pane-gender" name="gender" value={editTarget.gender}>
						<option value="MALE">Male</option>
						<option value="FEMALE">Female</option>
						<option value="OTHER">Other</option>
					</select>
				</div>
				<div class="field">
					<label for="pane-role">Role</label>
					<select id="pane-role" name="role" value={editTarget.role ?? 'USER'}>
						<option value="USER">Brother (USER)</option>
						<option value="ADMIN">Superadmin (ADMIN)</option>
					</select>
				</div>
				<div class="field">
					<label for="pane-status">Status</label>
					<select id="pane-status" name="status" value={editTarget.status ?? 'ACTIVE'}>
						<option value="ACTIVE">Active</option>
						<option value="INACTIVE">Sleeping</option>
						<option value="DEPARTED">Departed</option>
					</select>
				</div>
			</div>

			<div class="pane-footer">
				<button type="button" class="secondary" onclick={closeEditPane}>Cancel</button>
				<button type="submit">Save changes</button>
			</div>
		</form>
	</aside>
{/if}

<dialog
	bind:this={deleteDialog}
	class="modal-dialog purge-modal"
	onclose={() => {
		deleteTarget = null;
		deleteTypedName = '';
	}}
>
	<div class="modal-heading">
		<h2>Purge brother &amp; family?</h2>
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
		<div class="purge-warning-box">
			<p style="margin:0 0 0.75rem">
				You are about to permanently delete <strong>{deleteTarget.name}</strong>
				and
				<strong
					>{deleteTarget.familyCount}
					{deleteTarget.familyCount === 1 ? 'family member' : 'family members'}</strong
				>.
			</p>
			<p style="margin:0">
				By deleting this member, <strong>ALL his information — his and his family's</strong> — is
				purged from the database as an action that <strong>cannot be reversed</strong>.
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

			<div>
				<label for="confirm-brother-name">
					Type <strong>{deleteTarget.fullName}</strong> to enable deletion:
				</label>
				<input
					id="confirm-brother-name"
					name="confirmName"
					type="text"
					bind:value={deleteTypedName}
					placeholder={deleteTarget.fullName}
					autocomplete="off"
					required
				/>
			</div>

			<div class="modal-actions">
				<button type="button" class="secondary" onclick={closeDeleteModal}>Cancel</button>
				<button type="submit" class="danger" disabled={!canConfirmDelete}>
					Delete permanently
				</button>
			</div>
		</form>
	{/if}
</dialog>

<style>
	.brothers-page {
		max-width: 1050px;
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

	.brothers-table-wrap {
		margin-top: 1.75rem;
	}

	.name-cell {
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

	.bday-cell {
		font-size: 0.9375rem;
		white-space: nowrap;
	}

	.contact-cell {
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--text2);
	}

	.action-icons {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.sleep-btn.is-sleeping {
		background: var(--goldtint);
		border-color: var(--accent);
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

	.empty-brothers {
		padding: 2rem 1.5rem;
		color: var(--text2);
		text-align: center;
	}

	.brothers-count {
		margin: 1rem 0.25rem 0;
		font-size: 0.875rem;
		color: var(--text2);
	}

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
