<script>
  import { enhance } from "$app/forms";
  import { sortableTable } from "$lib/sortable-table.js";
  import PersonForm from "$lib/components/PersonForm.svelte";
  import Icon from "$lib/components/Icon.svelte";

  let { data, form } = $props();

  let userDialog;
  let confirmDialog;
  let editTarget = $state(null);
  let actionTarget = $state(null);
  let pendingAction = $state("");

  function openCreate() {
    editTarget = null;
    userDialog?.showModal();
  }

  function openEdit(user) {
    editTarget = user;
    userDialog?.showModal();
  }

  function openConfirmation(user, action) {
    actionTarget = user;
    pendingAction = action;
    confirmDialog?.showModal();
  }

  function closeUserDialog() {
    userDialog?.close();
    editTarget = null;
  }

  function closeConfirmation() {
    confirmDialog?.close();
    actionTarget = null;
    pendingAction = "";
  }

  function closeOnSuccess(getDialog, onClose = () => {}) {
    return () =>
      async ({ result, update }) => {
        await update();
        if (result.type === "success") {
          getDialog()?.close();
          onClose();
        }
      };
  }
</script>

<div class="page-head">
  <h1>Users</h1>
  <button
    class="icon-button add-user-button"
    type="button"
    onclick={openCreate}
    aria-label="Add user"
    title="Add user"><Icon name="plus" /></button
  >
</div>
{#if form?.error}
  <p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.generatedPassword}
  <p class="generated-password" role="status">
    Temporary password for {form.newUserEmail}:
    <code>{form.generatedPassword}</code>
    — share it once. It will not be shown again.
  </p>
{/if}

<div class="table-wrap">
  <table class="users-table" use:sortableTable>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th>Must change password</th>
        <th class="actions-column">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as user}
        <tr>
          <td>{user.full_name}</td>
          <td>{user.email}</td>
          <td>{user.role}</td>
          <td
            >{user.person_status === "ACTIVE"
              ? "Active"
              : user.person_status === "INACTIVE"
                ? "Inactive"
                : "Departed"}</td
          >
          <td>{user.must_change_password ? "Yes" : "No"}</td>
          <td class="row-actions">
            <div class="user-row-actions">
              <button
                class="icon-button"
                type="button"
                onclick={() => openEdit(user)}
                aria-label="Edit {user.full_name}"
                title="Edit"><Icon name="edit" /></button
              >
              <form
                method="POST"
                action="?/resetPassword"
                class="inline-form"
                use:enhance
              >
                <input type="hidden" name="csrf" value={data.csrf} />
                <input type="hidden" name="userId" value={user.id} />
                <button
                  class="icon-button"
                  type="submit"
                  aria-label="Reset password for {user.full_name}"
                  title="Reset password"><Icon name="key" /></button
                >
              </form>
              <button
                class="icon-button"
                type="button"
                onclick={() =>
                  openConfirmation(
                    user,
                    user.person_status === "ACTIVE" ? "archive" : "reactivate",
                  )}
                aria-label="{user.person_status === 'ACTIVE'
                  ? 'Archive'
                  : 'Reactivate'} {user.full_name}"
                title={user.person_status === "ACTIVE"
                  ? "Archive"
                  : "Reactivate"}
                ><Icon
                  name={user.person_status === "ACTIVE" ? "archive" : "restore"}
                /></button
              >
              <button
                class="icon-button danger-icon"
                type="button"
                onclick={() => openConfirmation(user, "delete")}
                aria-label="Delete account for {user.full_name}"
                title="Delete"><Icon name="trash" /></button
              >
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<dialog bind:this={userDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>{editTarget ? `Edit ${editTarget.full_name}` : "Add user"}</h2>
    <button
      class="icon-button"
      type="button"
      onclick={closeUserDialog}
      aria-label="Close"
      title="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  {#if form?.error}
    <p class="error" role="alert">{form.error}</p>
  {/if}
  <form
    method="POST"
    action={editTarget ? "?/update" : "?/create"}
    class="stack"
    use:enhance={closeOnSuccess(() => userDialog, closeUserDialog)}
  >
    {#if editTarget}
      <input type="hidden" name="userId" value={editTarget.id} />
    {/if}
    <PersonForm
      person={editTarget
        ? { ...editTarget, status: editTarget.person_status }
        : null}
      csrf={data.csrf}
      emailRequired={true}
      showStatus={Boolean(editTarget)}
      showSubmit={false}
    />
    <label for="user-role">Role</label>
    <select id="user-role" name="role" value={editTarget?.role ?? "USER"}>
      <option value="USER">USER</option>
      <option value="ADMIN">ADMIN</option>
    </select>
    <button type="submit">{editTarget ? "Save changes" : "Create user"}</button>
  </form>
</dialog>

<dialog bind:this={confirmDialog} class="modal-dialog confirm-dialog">
  <div class="modal-heading">
    <h2>
      {pendingAction === "delete"
        ? "Delete account?"
        : pendingAction === "archive"
          ? "Archive account?"
          : "Reactivate account?"}
    </h2>
    <button
      class="icon-button"
      type="button"
      onclick={closeConfirmation}
      aria-label="Close"
      title="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  {#if form?.error}
    <p class="error" role="alert">{form.error}</p>
  {/if}
  {#if pendingAction === "delete"}
    <p>
      The login for {actionTarget?.full_name} will be removed from this list. Their
      person record and historical references will be kept.
    </p>
  {:else if pendingAction === "archive"}
    <p>
      {actionTarget?.full_name} will no longer be able to sign in. Their account
      can be reactivated later.
    </p>
  {:else}
    <p>{actionTarget?.full_name} will be able to sign in again.</p>
  {/if}
  <form
    method="POST"
    action={pendingAction ? `?/${pendingAction}` : "?/archive"}
    class="modal-actions"
    use:enhance={closeOnSuccess(() => confirmDialog, closeConfirmation)}
  >
    <input type="hidden" name="csrf" value={data.csrf} />
    <input type="hidden" name="userId" value={actionTarget?.id ?? ""} />
    <button class="secondary" type="button" onclick={closeConfirmation}
      >Cancel</button
    >
    <button class={pendingAction === "delete" ? "danger" : ""} type="submit">
      {pendingAction === "delete"
        ? "Delete account"
        : pendingAction === "archive"
          ? "Archive"
          : "Reactivate"}
    </button>
  </form>
</dialog>
