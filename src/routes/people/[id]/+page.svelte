<script>
  import { sortableTable } from "$lib/sortable-table.js";
  import PersonForm from "$lib/components/PersonForm.svelte";
  import FamilyMembers from "$lib/components/FamilyMembers.svelte";
  import Icon from "$lib/components/Icon.svelte";
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
    <h1>{data.person.full_name}</h1>
    {#if data.person.status !== "ACTIVE"}
      <span class="badge">{data.person.status}</span>
    {/if}
  </div>
  <button
    class="secondary icon-button"
    type="button"
    onclick={() => open(editDialog)}
    aria-label="Edit person"
    title="Edit details"><Icon name="edit" /></button
  >
</div>
<p class="muted">Age (admin only): {data.age}</p>
{#if form?.error}
  <p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
  <p class="muted">Saved.</p>
{/if}

<section class="profile-grid">
  <div class="profile-summary">
    <div class="form-card profile-card">
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
          <span>Email</span><strong
            >{data.person.email || "Not provided"}</strong
          >
        </div>
        <div class="profile-field">
          <span>Phone</span><strong
            >{data.person.phone || "Not provided"}</strong
          >
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
    {#if data.household}
      <FamilyMembers
        household={data.household}
        currentPersonId={data.person.id}
        adminLinks={true}
        olderFirst={true}
        removable={true}
        onRemove={openRemove}
      />
    {/if}
  </div>
</section>

<section class="knowledge-section">
  <div class="section-heading">
    <h2>Dated knowledge</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => open(addDialog)}
      aria-label="Add dated knowledge"
      title="Add information"><Icon name="plus" /></button
    >
  </div>
  <div class="table-wrap">
    <table class="knowledge-table" use:sortableTable>
      <thead
        ><tr
          ><th>Date</th><th>Information</th><th class="actions-column"
            >Actions</th
          ></tr
        ></thead
      ><tbody>
        {#each data.knowledge as entry}
          <tr class:retired-row={entry.retired}
            ><td>{entry.effective_date}</td><td
              >{entry.body}{entry.retired ? " (retired)" : ""}</td
            ><td class="row-actions"
              ><button
                class="icon-button"
                type="button"
                onclick={() => open(viewDialog, entry)}
                aria-label="View knowledge"
                title="View"><Icon name="eye" /></button
              >{#if !entry.retired}<button
                  class="icon-button"
                  type="button"
                  onclick={() => open(editDialog, entry)}
                  aria-label="Edit knowledge"
                  title="Edit"><Icon name="edit" /></button
                ><button
                  class="icon-button danger-icon"
                  type="button"
                  onclick={() => open(deleteDialog, entry)}
                  aria-label="Delete knowledge"
                  title="Delete"><Icon name="trash" /></button
                >{/if}</td
            ></tr
          >
        {:else}<tr><td colspan="3" class="empty-cell">No entries yet.</td></tr
          >{/each}
      </tbody>
    </table>
  </div>
</section>

<dialog bind:this={editDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>{selectedEntry ? "Edit dated knowledge" : "Edit person"}</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => editDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  {#if selectedEntry}<form method="POST" action="?/editKnowledge" class="stack">
      <input type="hidden" name="csrf" value={data.csrf} /><input
        type="hidden"
        name="knowledgeId"
        value={selectedEntry.id}
      /><label for="edit-date">Date</label><input
        id="edit-date"
        name="effectiveDate"
        type="date"
        value={selectedEntry.effective_date}
        required
      /><label for="edit-body">Information</label><textarea
        id="edit-body"
        name="body"
        required>{selectedEntry.body}</textarea
      ><button type="submit">Save</button>
    </form>{:else}<form method="POST" action="?/save" class="stack">
      <PersonForm person={data.person} csrf={data.csrf} showStatus={true} />
    </form>{/if}
</dialog>
<dialog bind:this={addDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Add dated knowledge</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => addDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <form method="POST" action="?/addKnowledge" class="stack">
    <input type="hidden" name="csrf" value={data.csrf} /><label for="new-date"
      >Date</label
    ><input
      id="new-date"
      name="effectiveDate"
      type="date"
      value={data.today}
      required
    /><label for="new-body">Information</label><textarea
      id="new-body"
      name="body"
      required
    ></textarea><button type="submit">Add information</button>
  </form>
</dialog>
<dialog bind:this={viewDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Dated knowledge</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => viewDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  {#if selectedEntry}<p>{selectedEntry.body}</p>
    <p class="muted">
      {selectedEntry.effective_date} — {selectedEntry.author_name}
    </p>{/if}
</dialog>
<dialog bind:this={deleteDialog} class="modal-dialog confirm-dialog">
  <div class="modal-heading">
    <h2>Delete information?</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => deleteDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <p>This entry will be removed from the active list.</p>
  <form method="POST" action="?/deleteKnowledge" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} /><input
      type="hidden"
      name="knowledgeId"
      value={selectedEntry?.id ?? ""}
    /><button
      class="secondary"
      type="button"
      onclick={() => deleteDialog.close()}>No</button
    ><button class="danger" type="submit">Yes, delete</button>
  </form>
</dialog>
<dialog bind:this={removeDialog} class="modal-dialog confirm-dialog">
  <div class="modal-heading">
    <h2>Remove from household?</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => removeDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <p>
    {selectedMember?.full_name} will be removed from this household. Their own person
    record is not deleted.
  </p>
  <form method="POST" action="?/endRelationship" class="modal-actions">
    <input type="hidden" name="csrf" value={data.csrf} /><input
      type="hidden"
      name="membershipId"
      value={selectedMember?.membership_id ?? ""}
    /><button
      class="secondary"
      type="button"
      onclick={() => removeDialog.close()}>No</button
    ><button class="danger" type="submit">Yes, remove</button>
  </form>
</dialog>
