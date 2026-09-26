<script>
  import { sortableTable } from "$lib/sortable-table.js";
  import Icon from "$lib/components/Icon.svelte";
  import PersonForm from "$lib/components/PersonForm.svelte";

  let { data, form } = $props();
  const terms = $derived(data.lodge?.terminology ?? {});

  let addDialog;
  let editDialog;
  let editTarget = $state(null);

  function openAdd() {
    editTarget = null;
    addDialog?.showModal();
  }

  function openEdit(member) {
    editTarget = member;
    editDialog?.showModal();
  }

  function relationLabel(member) {
    if (member.relationship === "SPOUSE") return terms.spouse || "Spouse";
    if (member.gender === "MALE") return terms.son || "Son";
    if (member.gender === "FEMALE") return terms.daughter || "Daughter";
    return terms.child || "Child";
  }

  const rows = $derived(
    [
      data.household?.spouse
        ? { ...data.household.spouse, relationship: "SPOUSE" }
        : null,
      ...(data.household?.children ?? []).map((child) => ({
        ...child,
        relationship: "CHILD",
      })),
    ].filter(Boolean),
  );
</script>

<div class="page-head">
  <h1>My Family</h1>
  <button type="button" onclick={openAdd}>Add family member</button>
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
        <th>Name</th>
        <th>Relationship</th>
        <th>Date of birth</th>
        <th class="actions-column">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as member}
        <tr>
          <td>{member.full_name}</td>
          <td>{relationLabel(member)}</td>
          <td>{member.hasAccount ? "—" : member.birth_date}</td>
          <td class="row-actions">
            {#if member.hasAccount}
              <span class="muted">Manages their own account</span>
            {:else}
              <button
                class="icon-button"
                type="button"
                onclick={() => openEdit(member)}
                aria-label="Edit {member.full_name}"
                title="Edit"><Icon name="edit" /></button
              >
            {/if}
          </td>
        </tr>
      {:else}
        <tr
          ><td colspan="4" class="empty-cell">No family members on record.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>

<dialog bind:this={addDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Add family member</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => addDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  <form method="POST" action="?/addMember" class="stack">
    <input type="hidden" name="csrf" value={data.csrf} />
    <label for="family-relationship">Relationship</label>
    <select id="family-relationship" name="relationship" required>
      <option value="SPOUSE">{terms.spouse || "Spouse"}</option>
      <option value="CHILD">{terms.child || "Child"}</option>
    </select>
    <PersonForm csrf={data.csrf} submitLabel="Add family member" />
  </form>
</dialog>

<dialog bind:this={editDialog} class="modal-dialog">
  <div class="modal-heading">
    <h2>Edit {editTarget?.full_name ?? "family member"}</h2>
    <button
      class="icon-button"
      type="button"
      onclick={() => editDialog.close()}
      aria-label="Close"><Icon name="close" /></button
    >
  </div>
  {#if editTarget}
    <form method="POST" action="?/saveMember" class="stack">
      <input type="hidden" name="personId" value={editTarget.id} />
      <PersonForm person={editTarget} csrf={data.csrf} submitLabel="Save" />
    </form>
    <a class="text-link" href="/family/{editTarget.id}">View dated knowledge</a>
  {/if}
</dialog>
