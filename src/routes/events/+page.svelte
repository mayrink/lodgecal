<script>
  import { sortableTable } from "$lib/sortable-table.js";
  import Icon from "$lib/components/Icon.svelte";

  let { data, form } = $props();

  let addDialog;
  let editDialog;
  let archiveDialog;
  let editTarget = $state(null);
  let archiveTarget = $state(null);
  let selectedTypeId = $state(null);

  const typeId = $derived(selectedTypeId ?? data.types[0]?.id);
  const selectedType = $derived(
    data.types.find((t) => String(t.id) === String(typeId)),
  );
  const canRecur = $derived(Boolean(selectedType?.allows_recurrence));

  function openAdd() {
    editTarget = null;
    selectedTypeId = data.types[0]?.id ?? null;
    addDialog?.showModal();
  }

  function openEdit(event) {
    editTarget = event;
    selectedTypeId = event.event_type_id;
    editDialog?.showModal();
  }

  function openArchive(event) {
    archiveTarget = event;
    archiveDialog?.showModal();
  }
</script>

<div class="page-head">
  <h1>Events</h1>
  <button type="button" onclick={openAdd}>Add event</button>
</div>
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
        <th>Date</th>
        <th>Title</th>
        <th>Type</th>
        <th>Person</th>
        <th>Recurring</th>
        <th>Status</th>
        <th class="actions-column">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each data.events as event}
        <tr class:inactive={event.status !== "ACTIVE"}>
          <td>{event.iso_date}</td>
          <td>{event.title}</td>
          <td>{event.type_label}</td>
          <td>{event.person_name || "—"}</td>
          <td>{event.recurring ? "Yes" : "No"}</td>
          <td>{event.status === "ACTIVE" ? "Active" : "Archived"}</td>
          <td class="row-actions">
            <button
              class="icon-button"
              type="button"
              onclick={() => openEdit(event)}
              aria-label="Edit {event.title}"
              title="Edit"><Icon name="edit" /></button
            >
            {#if event.status === "ACTIVE"}
              <button
                class="icon-button danger-icon"
                type="button"
                onclick={() => openArchive(event)}
                aria-label="Archive {event.title}"
                title="Archive"><Icon name="trash" /></button
              >
            {:else}
              <form method="POST" action="?/reactivate" class="inline-form">
                <input type="hidden" name="csrf" value={data.csrf} />
                <input type="hidden" name="eventId" value={event.id} />
                <button class="secondary" type="submit">Reactivate</button>
              </form>
            {/if}
          </td>
        </tr>
      {:else}
        <tr><td colspan="7" class="empty-cell">No events on record.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<dialog bind:this={addDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Add event</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => addDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <form method="POST" action="?/create" class="stack">
    <input type="hidden" name="csrf" value={data.csrf} />
    <label for="add-title">Title</label>
    <input id="add-title" name="title" required />
    <label for="add-eventTypeId">Type</label>
    <select
      id="add-eventTypeId"
      name="eventTypeId"
      bind:value={selectedTypeId}
      required
    >
      {#each data.types as type}
        <option value={type.id}>{type.label}</option>
      {/each}
    </select>
    <label for="add-isoDate">Date</label>
    <input id="add-isoDate" name="isoDate" type="date" required />
    <label for="add-personName">Person (optional)</label>
    <input
      id="add-personName"
      name="personName"
      placeholder="e.g. the Brother being initiated"
    />
    {#if canRecur}
      <label>
        <input type="checkbox" name="recurring" />
        Recurs annually
      </label>
    {:else}
      <p class="muted">This type does not recur.</p>
    {/if}
    <label for="add-details">Details</label>
    <textarea id="add-details" name="details"></textarea>
    <button type="submit">Create event</button>
  </form>
</dialog>

<dialog bind:this={editDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Edit {editTarget?.title ?? "event"}</h2>
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
      <label for="edit-title">Title</label>
      <input id="edit-title" name="title" value={editTarget.title} required />
      <label for="edit-eventTypeId">Type</label>
      <select
        id="edit-eventTypeId"
        name="eventTypeId"
        bind:value={selectedTypeId}
        required
      >
        {#each data.types as type}
          <option value={type.id}>{type.label}</option>
        {/each}
      </select>
      <label for="edit-isoDate">Date</label>
      <input
        id="edit-isoDate"
        name="isoDate"
        type="date"
        value={editTarget.iso_date}
        required
      />
      <label for="edit-personName">Person (optional)</label>
      <input
        id="edit-personName"
        name="personName"
        value={editTarget.person_name}
      />
      {#if canRecur}
        <label>
          <input
            type="checkbox"
            name="recurring"
            checked={Boolean(editTarget.recurring)}
          />
          Recurs annually
        </label>
      {:else}
        <p class="muted">This type does not recur.</p>
      {/if}
      <label for="edit-details">Details</label>
      <textarea id="edit-details" name="details">{editTarget.details}</textarea>
      <button type="submit">Save</button>
    </form>
  {/if}
</dialog>

<dialog bind:this={archiveDialog} class="modal-dialog confirm-dialog">
  <div class="modal-heading">
    <h2>Archive event?</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => archiveDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <p>
    "{archiveTarget?.title}" will move out of the active list. It can be
    reactivated later.
  </p>
  <form method="POST" action="?/archive" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} />
    <input type="hidden" name="eventId" value={archiveTarget?.id ?? ""} />
    <button
      class="secondary"
      type="button"
      onclick={() => archiveDialog.close()}>No</button
    >
    <button class="danger" type="submit">Yes, archive</button>
  </form>
</dialog>
