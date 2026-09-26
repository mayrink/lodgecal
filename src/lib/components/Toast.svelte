<script>
  import Icon from "./Icon.svelte";
  import { fade, fly } from "svelte/transition";

  let {
    message = "Saved successfully.",
    duration = 5000,
    type = "success",
    onclose = null,
  } = $props();

  let visible = $state(true);

  $effect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        visible = false;
        onclose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  });

  function close() {
    visible = false;
    onclose?.();
  }
</script>

{#if visible}
  <div
    class="toast-notification {type}"
    role="status"
    aria-live="polite"
    in:fly={{ y: 16, duration: 200 }}
    out:fade={{ duration: 150 }}
  >
    <div class="toast-icon">
      <Icon name="check" />
    </div>
    <span class="toast-message">{message}</span>
    <button
      type="button"
      class="toast-close"
      onclick={close}
      aria-label="Dismiss notification"
    >
      <Icon name="close" />
    </button>
  </div>
{/if}

<style>
  .toast-notification {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.9rem;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 16px rgba(42, 33, 24, 0.12), 0 1px 3px rgba(42, 33, 24, 0.08);
    font-size: 0.9rem;
    max-width: calc(100vw - 3rem);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--success);
    flex: none;
  }

  .toast-message {
    flex: 1;
    min-width: 0;
  }

  .toast-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 0.2rem;
    margin: -0.2rem;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    min-height: auto;
    width: 1.5rem;
    height: 1.5rem;
  }

  .toast-close:hover {
    color: var(--text);
    background: var(--bg-muted);
  }

  @media (max-width: 640px) {
    .toast-notification {
      bottom: 1rem;
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>
