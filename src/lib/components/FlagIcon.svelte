<script>
	/** @type {{ code: string }} */
	let { code = 'br' } = $props();
	const norm = $derived((code || '').toLowerCase());
</script>

{#if norm === 'br' || norm === 'pt-br' || norm === 'pt'}
	<!-- Brazil Flag -->
	<svg class="flag-svg" viewBox="0 0 28 20" aria-hidden="true" focusable="false">
		<rect width="28" height="20" rx="2.5" fill="#009B3A" />
		<polygon points="14,2.5 25,10 14,17.5 3,10" fill="#FEDF00" />
		<circle cx="14" cy="10" r="4.2" fill="#002776" />
		<path d="M10.1 8.8A6.5 6.5 0 0 1 18.1 10.6" stroke="#FFFFFF" stroke-width="1.1" fill="none" />
	</svg>
{:else if norm === 'gb' || norm === 'uk' || norm === 'en' || norm === 'us'}
	<!-- UK Union Flag (English) -->
	<svg class="flag-svg" viewBox="0 0 28 20" aria-hidden="true" focusable="false">
		<rect width="28" height="20" rx="2.5" fill="#012169" />
		<path d="M0,0 L28,20 M28,0 L0,20" stroke="#FFFFFF" stroke-width="3.6" />
		<path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" stroke-width="1.8" />
		<path d="M14,0 V20 M0,10 H28" stroke="#FFFFFF" stroke-width="5.6" />
		<path d="M14,0 V20 M0,10 H28" stroke="#C8102E" stroke-width="3.2" />
	</svg>
{:else if norm === 'es'}
	<!-- Spain Flag -->
	<svg class="flag-svg" viewBox="0 0 28 20" aria-hidden="true" focusable="false">
		<rect width="28" height="20" rx="2.5" fill="#AA151B" />
		<rect y="5" width="28" height="10" fill="#F1BF00" />
		<rect x="6" y="7.2" width="3" height="5.6" rx="1" fill="#AA151B" />
	</svg>
{:else}
	<!-- Fallback badge for user-added languages -->
	<span class="flag-fallback" aria-hidden="true">{norm.slice(0, 2).toUpperCase()}</span>
{/if}

<style>
	.flag-svg {
		width: 1.35rem;
		height: 0.96rem;
		border-radius: 2.5px;
		display: inline-block;
		vertical-align: middle;
		flex: none;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22);
	}

	.flag-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.35rem;
		height: 0.96rem;
		font-size: 0.65rem;
		font-weight: 600;
		border-radius: 2.5px;
		background: rgba(255, 255, 255, 0.2);
		color: inherit;
	}
</style>
