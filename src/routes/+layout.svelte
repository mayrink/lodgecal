<script>
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { enhance } from "$app/forms";
  import Icon from "$lib/components/Icon.svelte";

  let { data, children } = $props();

  let sidebarOpen = $state(false);
  let sidebarCollapsed = $state(false);
  let theme = $state("light");
  const isAdmin = $derived(data.user?.role === "ADMIN");
  const authed = $derived(Boolean(data.user));
  const authPage = $derived(
    data.path === "/login" ||
      data.path === "/setup" ||
      data.path === "/change-password",
  );

  $effect(() => {
    if (typeof document === "undefined") return;
    const stored = localStorage.getItem("lodgecal-theme");
    if (stored === "dark" || stored === "light") {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
    if (localStorage.getItem("lodgecal-sidebar-collapsed") === "true") {
      sidebarCollapsed = true;
    }
    document.documentElement.dataset.theme = theme;
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lodgecal-theme", theme);
  }

  function nav(href) {
    return data.path === href ? "page" : undefined;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  function toggleSidebarCollapsed() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem(
      "lodgecal-sidebar-collapsed",
      String(sidebarCollapsed),
    );
  }

  function onKey(event) {
    if (event.key === "Escape") sidebarOpen = false;
  }

  $effect(() => {
    if (typeof document === "undefined") return;
    if (sidebarOpen) {
      document.getElementById("app-sidebar")?.querySelector("a")?.focus();
    }
  });
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>{data.lodge?.name || "LodgeCal"}</title>
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<a class="skip-link" href="#content">Skip to content</a>

{#if authPage || !authed}
  <div class="auth-shell">
    {@render children()}
  </div>
{:else}
  <div class="app-shell" class:collapsed={sidebarCollapsed}>
    <button
      class="menu-toggle secondary"
      type="button"
      aria-expanded={sidebarOpen}
      aria-controls="app-sidebar"
      onclick={() => (sidebarOpen = !sidebarOpen)}
    >
      Menu
    </button>
    {#if sidebarOpen}
      <button
        class="scrim"
        type="button"
        aria-label="Close menu"
        onclick={closeSidebar}
      ></button>
    {/if}
    <nav
      id="app-sidebar"
      class="sidebar"
      class:open={sidebarOpen}
      aria-label="Main"
    >
      <div class="brand">
        {#if data.lodge?.logoUrl}
          <img class="logo" src={data.lodge.logoUrl} alt="" />
        {/if}
        <div>{data.lodge?.name || "LodgeCal"}</div>
        {#if data.lodge?.obedience}
          <div class="muted brand-sub">{data.lodge.obedience}</div>
        {/if}
      </div>
      <a
        href="/"
        aria-current={nav("/")}
        aria-label="Home"
        title="Home"
        onclick={closeSidebar}
      >
        <Icon name="home" /><span class="label">Home</span>
      </a>
      <a
        href="/me"
        aria-current={nav("/me")}
        aria-label="My Details"
        title="My Details"
        onclick={closeSidebar}
      >
        <Icon name="user" /><span class="label">My Details</span>
      </a>
      <a
        href="/family"
        aria-current={nav("/family")}
        aria-label="My Family"
        title="My Family"
        onclick={closeSidebar}
      >
        <Icon name="family" /><span class="label">My Family</span>
      </a>
      {#if isAdmin}
        <div class="nav-label">Administration</div>
        <a
          href="/people"
          aria-current={nav("/people")}
          aria-label="People"
          title="People"
          onclick={closeSidebar}
        >
          <Icon name="people" /><span class="label">People</span>
        </a>
        <a
          href="/events"
          aria-current={nav("/events")}
          aria-label="Events"
          title="Events"
          onclick={closeSidebar}
        >
          <Icon name="calendar" /><span class="label">Events</span>
        </a>
        <a
          href="/event-types"
          aria-current={nav("/event-types")}
          aria-label="Event Types"
          title="Event Types"
          onclick={closeSidebar}
        >
          <Icon name="tag" /><span class="label">Event Types</span>
        </a>
        <a
          href="/users"
          aria-current={nav("/users")}
          aria-label="Users"
          title="Users"
          onclick={closeSidebar}
        >
          <Icon name="badge" /><span class="label">Users</span>
        </a>
        <a
          href="/settings"
          aria-current={nav("/settings")}
          aria-label="Lodge/Settings"
          title="Lodge/Settings"
          onclick={closeSidebar}
        >
          <Icon name="gear" /><span class="label">Lodge/Settings</span>
        </a>
      {/if}
      <div class="sidebar-spacer"></div>
      <button
        class="secondary collapse-btn"
        type="button"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={sidebarCollapsed ? "Expand" : "Collapse"}
        onclick={toggleSidebarCollapsed}
      >
        <Icon name={sidebarCollapsed ? "chevron-right" : "chevron-left"} />
        <span class="label">{sidebarCollapsed ? "Expand" : "Collapse"}</span>
      </button>
      <p class="muted signed-in">{data.person?.fullName}</p>
      <button
        class="secondary"
        type="button"
        aria-label={theme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        onclick={toggleTheme}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} />
        <span class="label"
          >{theme === "dark" ? "Light mode" : "Dark mode"}</span
        >
      </button>
      <form method="POST" action="/logout" use:enhance>
        <input type="hidden" name="csrf" value={data.csrf} />
        <button
          class="secondary"
          type="submit"
          aria-label="Log out"
          title="Log out"
        >
          <Icon name="logout" /><span class="label">Log out</span>
        </button>
      </form>
    </nav>
    <main id="content" class="main">
      <div class="content">
        {@render children()}
      </div>
    </main>
  </div>
{/if}
