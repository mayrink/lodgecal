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
  let familyDialog;
  let selectedEntry = $state(null);

  function open(dialog, entry = null) {
    selectedEntry = entry;
    dialog?.showModal();
  }

  function getInitials(name) {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
</script>

<div class="page-head profile-heading">
  <div class="header-with-monogram">
    <div class="member-monogram" aria-hidden="true">
      {getInitials(data.person.full_name)}
    </div>
    <div class="header-text-group">
      <div class="heading-title-group">
        <h1>{data.person.full_name}</h1>
      </div>
      <p class="muted header-meta">
        Personal Record Sheet
        {#if data.isAdmin && data.age != null}
          &bull; Age: {data.age}
        {/if}
      </p>
    </div>
  </div>
  <button
    class="secondary icon-button"
    type="button"
    onclick={() => open(editDialog)}
    aria-label="Edit my details"
    title="Edit details"
  >
    <Icon name="edit" />
  </button>
</div>

{#if form?.error}
  <div class="error" role="alert">{form.error}</div>
{/if}
{#if form?.saved}
  <Toast message="Record updated in Lodge register." duration={5000} />
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
          <span>Email</span><strong>{data.person.email}</strong>
        </div>
        <div class="profile-field">
          <span>Phone</span><strong>{data.person.phone || "Not provided"}</strong>
        </div>
      </div>
      <button type="button" class="wide-button" onclick={() => open(editDialog)}>
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
        olderFirst={true}
        adminLinks={data.isAdmin}
        dependentLinks={!data.isAdmin}
      />
    {:else}
      <p class="muted family-empty">No family members on record.</p>
    {/if}
    <button
      type="button"
      class="wide-button"
      onclick={() => familyDialog.showModal()}
    >
      Add family member
    </button>
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
          <tr>
            <td class="date-cell">
              <span class="ledger-date-pill">{entry.effective_date}</span>
            </td>
            <td>{entry.body}</td>
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
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="3" class="empty-knowledge-state">
              <div class="empty-state-card">
                <div class="empty-icon-ring">
                  <Icon name="tag" />
                </div>
                <p class="empty-title">No dated knowledge entries</p>
                <p class="muted empty-desc">
                  Record Masonic milestones, academic degrees, or personal notes in your Lodge ledger.
                </p>
                <button
                  type="button"
                  class="secondary"
                  onclick={() => open(addDialog)}
                >
                  <Icon name="plus" />
                  <span>Add first entry</span>
                </button>
              </div>
            </td>
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
    <h2>{selectedEntry ? "Edit dated knowledge" : "Edit my details"}</h2>
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
      <PersonForm person={data.person} csrf={data.csrf} emailRequired={true} submitLabel="Save details" />
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
  <form method="POST" action="?/knowledge" class="stack">
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
  bind:this={familyDialog}
  class="modal-dialog"
  onclick={(e) => { if (e.target === familyDialog) familyDialog.close(); }}
>
  <div class="modal-heading">
    <h2>Add family member</h2>
    <button
      class="icon-button secondary"
      type="button"
      onclick={() => familyDialog.close()}
      aria-label="Close"
    >
      <Icon name="close" />
    </button>
  </div>
  <form method="POST" action="?/addMember" class="stack">
    <input type="hidden" name="csrf" value={data.csrf} />
    <div class="field">
      <label for="family-relationship">Relationship</label>
      <select id="family-relationship" name="relationship" required>
        <option value="SPOUSE">Spouse</option>
        <option value="CHILD">Child</option>
      </select>
    </div>
    <PersonForm csrf={data.csrf} submitLabel="Add family member" />
  </form>
</dialog>
