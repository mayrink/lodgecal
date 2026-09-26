<script>
  import Icon from "./Icon.svelte";

  let {
    household,
    currentPersonId,
    emptyLabel = "No family members on record.",
    adminLinks = false,
    dependentLinks = false,
    removable = false,
    olderFirst = false,
    onRemove = null,
  } = $props();

  function orderMembersByAge(items) {
    if (!olderFirst) return items;
    return [...items].sort((left, right) => {
      const leftBirthDate = left.birth_date ?? "";
      const rightBirthDate = right.birth_date ?? "";
      if (!leftBirthDate) return rightBirthDate ? 1 : 0;
      if (!rightBirthDate) return -1;
      return leftBirthDate.localeCompare(rightBirthDate);
    });
  }

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
      return orderMembersByAge(
        [household.spouse, ...children].filter(Boolean).map((member) => ({
          ...member,
          relationship: member === household.spouse ? "SPOUSE" : "CHILD",
          hasAccount: member.has_account,
        })),
      );
    }

    if (viewingSpouse) {
      return orderMembersByAge(
        [household.user, ...children].filter(Boolean).map((member) => ({
          ...member,
          relationship: member === household.user ? "SPOUSE" : "CHILD",
          hasAccount: member === household.user ? true : member.has_account,
        })),
      );
    }

    return orderMembersByAge(
      [head, spouse, ...children].filter(Boolean).map((member) => ({
        ...member,
        relationship:
          member === head || member === spouse ? "PARENT" : "SIBLING",
        hasAccount: member === head ? true : member.has_account,
      })),
    );
  });
</script>

{#if members.length}
  <div class="family-members" aria-label="Family members">
    {#each members as member}
      <div class="family-member">
        {#if adminLinks}
          <a class="family-member-link" href="/people/{member.id}">
            <span class="family-member-name">{member.full_name}</span>
            <span class="relation-pill {relationClass(member)}"
              >{relationLabel(member)}</span
            >
          </a>
        {:else if dependentLinks && !member.hasAccount}
          <a class="family-member-link" href="/family/{member.id}">
            <span class="family-member-name">{member.full_name}</span>
            <span class="relation-pill {relationClass(member)}"
              >{relationLabel(member)}</span
            >
          </a>
        {:else}
          <span class="family-member-link">
            <span class="family-member-name">{member.full_name}</span>
            <span class="relation-pill {relationClass(member)}"
              >{relationLabel(member)}</span
            >
          </span>
        {/if}
        {#if removable && member.membership_id}
          <button
            type="button"
            class="icon-button danger-icon family-member-remove"
            onclick={() => onRemove?.(member)}
            aria-label="Remove {member.full_name} from household"
            title="Remove from household"
          >
            <Icon name="trash" />
          </button>
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <p class="muted family-empty">{emptyLabel}</p>
{/if}

<style>
  .family-member {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .family-member-link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: inherit;
    text-decoration: none;
  }

  .family-member-remove {
    flex: none;
    width: 1.9rem;
    min-width: 1.9rem;
    height: 1.9rem;
    min-height: 1.9rem;
    padding: 0.3rem;
  }

  /* Same compact-desktop/full-touch-target split as .row-actions .icon-button. */
  @media (pointer: coarse) {
    .family-member-remove {
      width: 2.75rem;
      min-width: 2.75rem;
      height: 2.75rem;
      min-height: 2.75rem;
    }
  }
</style>
