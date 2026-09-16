<script>
  let {
    household,
    currentPersonId,
    emptyLabel = "No family members on record.",
  } = $props();

  function relationLabel(member) {
    if (member.relationship === "PARENT") {
      if (member.gender === "FEMALE") return "Mother";
      if (member.gender === "MALE") return "Father";
      return "Parent";
    }
    if (member.relationship === "SIBLING") {
      if (member.gender === "FEMALE") return "Sister";
      if (member.gender === "MALE") return "Brother";
      return "Sibling";
    }
    if (member.relationship === "SPOUSE") {
      return "Spouse";
    }
    if (member.gender === "MALE") return "Son";
    if (member.gender === "FEMALE") return "Daughter";
    return "Child";
  }

  function relationClass(member) {
    if (member.relationship === "SPOUSE") return "spouse";
    if (member.gender === "MALE") return "male";
    if (member.gender === "FEMALE") return "female";
    if (member.relationship === "PARENT") return "parent";
    if (member.relationship === "SIBLING") return "sibling";
    return "child";
  }

  const members = $derived.by(() => {
    if (!household) return [];

    const currentId = Number(currentPersonId);
    const viewingHead = household.user?.id === currentId;
    const viewingSpouse = household.spouse?.id === currentId;
    const viewingChild = !viewingHead && !viewingSpouse;
    const head = viewingHead ? null : household.user;
    const spouse = household.spouse?.id === currentId ? null : household.spouse;
    const children = (household.children ?? []).filter(
      (child) => child.id !== currentId,
    );

    if (viewingHead) {
      return [household.spouse, ...children].filter(Boolean).map((member) => ({
        ...member,
        relationship: member === household.spouse ? "SPOUSE" : "CHILD",
      }));
    }

    if (viewingSpouse) {
      return [household.user, ...children].filter(Boolean).map((member) => ({
        ...member,
        relationship: member === household.user ? "SPOUSE" : "CHILD",
      }));
    }

    return [head, spouse, ...children].filter(Boolean).map((member) => ({
      ...member,
      relationship: member === head || member === spouse ? "PARENT" : "SIBLING",
    }));
  });
</script>

{#if members.length}
  <div class="family-members" aria-label="Family members">
    {#each members as member}
      <a class="family-member" href="/people/{member.id}">
        <span class="family-member-name">{member.full_name}</span>
        <span class="relation-pill {relationClass(member)}"
          >{relationLabel(member)}</span
        >
      </a>
    {/each}
  </div>
{:else}
  <p class="muted family-empty">{emptyLabel}</p>
{/if}
