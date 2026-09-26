<script>
  import { sortableTable } from "$lib/sortable-table.js";
  import Icon from "$lib/components/Icon.svelte";

  let { data, form } = $props();

  let editDialog;
  let archiveDialog;
  let editTarget = $state(null);
  let archiveTarget = $state(null);

  function openEdit(type) {
    editTarget = type;
    editDialog?.showModal();
  }

  function openArchive(type) {
    archiveTarget = type;
    archiveDialog?.showModal();
  }
</script>

<h1>Event Types</h1>
{#if form?.error}
  <p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
  <p class="muted">Saved.</p>
{/if}

<div class="table-wrap">
  <table use:sortableTable>
    <thead>
      <tr>
        <th>Key</th>
        <th>Label</th>
        <th>Recurrence</th>
        <th>System</th>
        <th>Status</th>
        <th class="actions-column">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each data.types as type}
        <tr class:inactive={!type.is_active}>
          <td><code>{type.key}</code></td>
          <td>{type.label}</td>
          <td>{type.allows_recurrence ? "Allowed" : "Never"}</td>
          <td
            >{type.is_system ? "Yes" : "No"}{type.derived
              ? " (derived)"
              : ""}</td
          >
          <td>{type.is_active ? "Active" : "Archived"}</td>
          <td class="row-actions">
            {#if !type.is_system}
              <button
                class="icon-button"
                type="button"
                onclick={() => openEdit(type)}
                aria-label="Edit {type.label}"
                title="Edit"><Icon name="edit" /></button
              >
              {#if type.is_active}
                <button
                  class="icon-button danger-icon"
                  type="button"
                  onclick={() => openArchive(type)}
                  aria-label="Archive {type.label}"
                  title="Archive"><Icon name="trash" /></button
                >
              {:else}
                <form method="POST" action="?/reactivate" class="inline-form">
                  <input type="hidden" name="csrf" value={data.csrf} />
                  <input type="hidden" name="id" value={type.id} />
                  <button class="secondary" type="submit">Reactivate</button>
                </form>
              {/if}
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<form
  method="POST"
  action="?/create"
  class="form-card stack"
  style="margin-top:1.5rem"
>
  <h2>Add type</h2>
  <input type="hidden" name="csrf" value={data.csrf} />
  <label for="label">Label</label>
  <input id="label" name="label" required />
  <label>
    <input type="checkbox" name="allowsRecurrence" />
    Allows annual recurrence
  </label>
  <button type="submit">Create type</button>
</form>

<dialog bind:this={editDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Edit {editTarget?.label ?? "event type"}</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => editDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  {#if editTarget}
    <form method="POST" action="?/update" class="stack">
      <input type="hidden" name="csrf" value={data.csrf} />
      <input type="hidden" name="id" value={editTarget.id} />
      <label for="edit-label">Label</label>
      <input id="edit-label" name="label" value={editTarget.label} required />
      <label>
        <input
          type="checkbox"
          name="allowsRecurrence"
          checked={Boolean(editTarget.allows_recurrence)}
        />
        Allows annual recurrence
      </label>
      <button type="submit">Save</button>
    </form>
  {/if}
</dialog>

<dialog bind:this={archiveDialog} class="modal-dialog confirm-dialog">
  <div class="modal-heading">
    <h2>Archive event type?</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => archiveDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <p>
    "{archiveTarget?.label}" will no longer be offered when creating new events.
    Existing events using it are not affected, and it can be reactivated later.
  </p>
  <form method="POST" action="?/archive" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} />
    <input type="hidden" name="id" value={archiveTarget?.id ?? ""} />
    <button
      class="secondary"
      type="button"
      onclick={() => archiveDialog.close()}>No</button
    >
    <button class="danger" type="submit">Yes, archive</button>
  </form>
</dialog>
