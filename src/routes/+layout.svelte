<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { honorificName } from '$lib/display.js';

	let { data, children } = $props();

	let theme = $state('light');
	const isAdmin = $derived(data.user?.role === 'ADMIN');
	const authed = $derived(Boolean(data.user));
	const authPage = $derived(
		data.path === '/login' || data.path === '/setup' || data.path === '/change-password'
	);

	const userDisplay = $derived(
		data.person
			? honorificName(data.person, data.lodge?.terminology ?? {})
			: data.user?.role === 'ADMIN'
				? 'Superadmin'
				: ''
	);

	$effect(() => {
		if (typeof document === 'undefined') return;
		const stored = localStorage.getItem('lodgecal-theme');
		if (stored === 'dark' || stored === 'light') {
			theme = stored;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		}
		document.documentElement.dataset.theme = theme;
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('lodgecal-theme', theme);
	}

	function isBirthdaysActive(path) {
		return path === '/' ? 'page' : undefined;
	}

	function isFamilyActive(path) {
		return path.startsWith('/family') || path.startsWith('/me') ? 'page' : undefined;
	}

	function isBrothersActive(path) {
		return path.startsWith('/brothers') ? 'page' : undefined;
	}

	function isAdminActive(path) {
		return path.startsWith('/admin') ||
			path.startsWith('/people') ||
			path.startsWith('/users') ||
			path.startsWith('/events') ||
			path.startsWith('/event-types') ||
			path.startsWith('/settings')
			? 'page'
			: undefined;
	}
</script>

<svelte:head>
	<title>{data.lodge?.name || 'LodgeCal'}</title>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<a class="skip-link" href="#content">Skip to content</a>

{#if authPage || !authed}
	<div class="auth-split">
		<section class="auth-hero">
			<div class="auth-hero-brand">
				{#if data.lodge?.logoUrl}
					<img class="brand-logo-img" src={data.lodge.logoUrl} alt="" />
				{:else}
					<span class="brand-emblem" aria-hidden="true"><Icon name="flame" /></span>
				{/if}
				<span>{data.lodge?.name || 'Lodge Birthdays'}</span>
			</div>
			<div>
				<div class="auth-gold-rule"></div>
				<p class="auth-hero-headline">Every brother, every family, remembered on their day.</p>
				<p>
					A private place for our lodge to keep birthdays and the small things that make each card
					personal.
				</p>
			</div>
			<div class="auth-hero-foot">
				<span>For brothers of the lodge and their families only.</span>
				<button
					type="button"
					class="header-btn header-icon-btn"
					onclick={toggleTheme}
					aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
					title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
				>
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} />
				</button>
			</div>
		</section>
		<main id="content" class="auth-panel">
			{@render children()}
		</main>
	</div>
{:else}
	<header class="top-header">
		<div class="top-header-inner">
			<a class="brand-link" href="/">
				{#if data.lodge?.logoUrl}
					<img class="brand-logo-img" src={data.lodge.logoUrl} alt="" />
				{:else}
					<span class="brand-emblem" aria-hidden="true"><Icon name="flame" /></span>
				{/if}
				<span>{data.lodge?.name || 'Lodge Birthdays'}</span>
			</a>
			<nav class="top-nav" aria-label="Main">
				<a class="top-nav-link" href="/" aria-current={isBirthdaysActive(data.path)}>Birthdays</a>
				<a class="top-nav-link" href="/family" aria-current={isFamilyActive(data.path)}
					>My family</a
				>
				<a class="top-nav-link" href="/brothers" aria-current={isBrothersActive(data.path)}
					>Brothers</a
				>
				{#if isAdmin}
					<a class="top-nav-link" href="/admin" aria-current={isAdminActive(data.path)}>Admin</a>
				{/if}
			</nav>
			<div class="header-controls">
				<span class="header-user-name">{userDisplay}</span>
				<button
					type="button"
					class="header-btn header-icon-btn"
					onclick={toggleTheme}
					aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
					title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
				>
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} />
				</button>
				<form method="POST" action="/logout" use:enhance>
					<input type="hidden" name="csrf" value={data.csrf} />
					<button class="header-btn" type="submit">Sign out</button>
				</form>
			</div>
		</div>
	</header>

	<main id="content" class="page-main">
		{@render children()}
	</main>
{/if}
