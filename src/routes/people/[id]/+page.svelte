<script>
  import { sortableTable } from "$lib/sortable-table.js";
  import PersonForm from "$lib/components/PersonForm.svelte";
  import FamilyMembers from "$lib/components/FamilyMembers.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import Toast from "$lib/components/Toast.svelte";
  let { data, form } = $props();
  let editDialog;
  let addDialog;
  let viewDialog;
  let deleteDialog;
  let removeDialog;
  let selectedEntry = $state(null);
  let selectedMember = $state(null);

  function open(dialog, entry = null) {
    selectedEntry = entry;
    dialog?.showModal();
  }

  function openRemove(member) {
    selectedMember = member;
    removeDialog?.showModal();
  }
</script>

<div class="page-head profile-heading">
  <div>
    <div class="heading-title-group">
      <h1>{data.person.full_name}</h1>
      {#if data.person.status !== "ACTIVE"}
        <span class="badge">{data.person.status}</span>
      {/if}
    </div>
    {#if data.age != null}
      <p class="muted header-meta">Age (admin only): {data.age}</p>
    {/if}
  </div>
  <button
    class="secondary icon-button"
    type="button"
    onclick={() => open(editDialog)}
    aria-label="Edit person"
    title="Edit details"
  >
    <Icon name="edit" />
  </button>
</div>

{#if form?.error}
  <div class="error" role="alert">{form.error}</div>
{/if}
{#if form?.saved}
  <Toast message="Person details saved successfully." duration={5000} />
{/if}

<section class="profile-grid">
  <div class="profile-summary">
    <div class="form-card profile-card">
      <div class="card-header">
        <h2>Personal Details</h2>
      </div>
      <div class="profile-field">
        <span>Full name</span><strong>{data.person.full_name}</strong>
      </div>
      <div class="profile-fields">
        <div class="profile-field">
          <span>Gender</span><strong>{data.person.gender}</strong>
        </div>
        <div class="profile-field">
          <span>Date of birth</span><strong>{data.person.birth_date}</strong>
        </div>
        <div class="profile-field">
          <span>Email</span><strong>{data.person.email || "Not provided"}</strong>
        </div>
        <div class="profile-field">
          <span>Phone</span><strong>{data.person.phone || "Not provided"}</strong>
        </div>
      </div>
      <button
        type="button"
        class="wide-button"
        onclick={() => open(editDialog)}
      >
        Edit details
      </button>
    </div>
  </div>
  <div class="form-card household-card">
    <div class="card-header">
      <h2>Household</h2>
    </div>
    {#if data.household}
      <FamilyMembers
        household={data.household}
        currentPersonId={data.person.id}
        adminLinks={true}
        olderFirst={true}
        removable={true}
        onRemove={openRemove}
      />
    {:else}
      <p class="muted family-empty">No household members on record.</p>
    {/if}
  </div>
</section>

<section class="knowledge-section">
  <div class="section-heading">
    <h2>Dated knowledge</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => open(addDialog)}
      aria-label="Add dated knowledge"
      title="Add information"
    >
      <Icon name="plus" />
    </button>
  </div>
  <div class="table-wrap">
    <table class="knowledge-table" use:sortableTable>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Information</th>
          <th scope="col" class="actions-column">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.knowledge as entry}
          <tr class:retired-row={entry.retired}>
            <td class="date-cell">{entry.effective_date}</td>
            <td>
              {entry.body}
              {#if entry.retired}
                <span class="retired-tag">(retired)</span>
              {/if}
            </td>
            <td class="row-actions">
              <button
                class="icon-button"
                type="button"
                onclick={() => open(viewDialog, entry)}
                aria-label="View knowledge entry from {entry.effective_date}"
                title="View"
              >
                <Icon name="eye" />
              </button>
              {#if !entry.retired}
                <button
                  class="icon-button"
                  type="button"
                  onclick={() => open(editDialog, entry)}
                  aria-label="Edit knowledge entry from {entry.effective_date}"
                  title="Edit"
                >
                  <Icon name="edit" />
                </button>
                <button
                  class="icon-button danger-icon"
                  type="button"
                  onclick={() => open(deleteDialog, entry)}
                  aria-label="Delete knowledge entry from {entry.effective_date}"
                  title="Delete"
                >
                  <Icon name="trash" />
                </button>
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="3" class="empty-cell">No dated knowledge entries on record.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<dialog
  bind:this={editDialog}
  class="modal-dialog"
  onclick={(e) => { if (e.target === editDialog) editDialog.close(); }}
>
  <div class="modal-heading">
    <h2>{selectedEntry ? "Edit dated knowledge" : "Edit person"}</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => editDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  {#if selectedEntry}
    <form method="POST" action="?/editKnowledge" class="stack">
      <input type="hidden" name="csrf" value={data.csrf} />
      <input type="hidden" name="knowledgeId" value={selectedEntry.id} />
      <div class="field">
        <label for="edit-date">Date</label>
        <input
          id="edit-date"
          name="effectiveDate"
          type="date"
          value={selectedEntry.effective_date}
          required
        />
      </div>
      <div class="field">
        <label for="edit-body">Information</label>
        <textarea
          id="edit-body"
          name="body"
          required
        >{selectedEntry.body}</textarea>
      </div>
      <div class="modal-actions">
        <button class="secondary" type="button" onclick={() => editDialog.close()}>Cancel</button>
        <button type="submit">Save changes</button>
      </div>
    </form>
  {:else}
    <form method="POST" action="?/save" class="stack">
      <PersonForm person={data.person} csrf={data.csrf} showStatus={true} submitLabel="Save details" />
    </form>
  {/if}
</dialog>

<dialog
  bind:this={addDialog}
  class="modal-dialog"
  onclick={(e) => { if (e.target === addDialog) addDialog.close(); }}
>
  <div class="modal-heading">
    <h2>Add dated knowledge</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => addDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  <form method="POST" action="?/addKnowledge" class="stack">
    <input type="hidden" name="csrf" value={data.csrf} />
    <div class="field">
      <label for="new-date">Date</label>
      <input
        id="new-date"
        name="effectiveDate"
        type="date"
        value={data.today}
        required
      />
    </div>
    <div class="field">
      <label for="new-body">Information</label>
      <textarea
        id="new-body"
        name="body"
        placeholder="Record a milestone, achievement, or historical fact..."
        required
      ></textarea>
    </div>
    <div class="modal-actions">
      <button class="secondary" type="button" onclick={() => addDialog.close()}>Cancel</button>
      <button type="submit">Add information</button>
    </div>
  </form>
</dialog>

<dialog
  bind:this={viewDialog}
  class="modal-dialog"
  onclick={(e) => { if (e.target === viewDialog) viewDialog.close(); }}
>
  <div class="modal-heading">
    <h2>Dated knowledge details</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => viewDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  {#if selectedEntry}
    <div class="modal-body">
      <p>{selectedEntry.body}</p>
      <div class="meta-text">
        <Icon name="calendar" />
        <span>{selectedEntry.effective_date}</span>
        {#if selectedEntry.author_name}
          <span>&bull;</span>
          <span>Recorded by {selectedEntry.author_name}</span>
        {/if}
      </div>
    </div>
  {/if}
  <div class="modal-actions">
    <button class="secondary" type="button" onclick={() => viewDialog.close()}>Close</button>
  </div>
</dialog>

<dialog
  bind:this={deleteDialog}
  class="modal-dialog confirm-dialog"
  onclick={(e) => { if (e.target === deleteDialog) deleteDialog.close(); }}
>
  <div class="modal-heading">
    <h2>Delete information?</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => deleteDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  <p>This entry will be removed from the active list.</p>
  <form method="POST" action="?/deleteKnowledge" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} />
    <input
      type="hidden"
      name="knowledgeId"
      value={selectedEntry?.id ?? ""}
    />
    <button
      class="secondary"
      type="button"
      onclick={() => deleteDialog.close()}
    >Cancel</button>
    <button class="danger" type="submit">Yes, delete</button>
  </form>
</dialog>

<dialog
  bind:this={removeDialog}
  class="modal-dialog confirm-dialog"
  onclick={(e) => { if (e.target === removeDialog) removeDialog.close(); }}
>
  <div class="modal-heading">
    <h2>Remove from household?</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => removeDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  <p>
    {selectedMember?.full_name} will be removed from this household. Their own person
    record is not deleted.
  </p>
  <form method="POST" action="?/endRelationship" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} />
    <input
      type="hidden"
      name="membershipId"
      value={selectedMember?.membership_id ?? ""}
    />
    <button
      class="secondary"
      type="button"
      onclick={() => removeDialog.close()}
    >Cancel</button>
    <button class="danger" type="submit">Yes, remove</button>
  </form>
</dialog>
