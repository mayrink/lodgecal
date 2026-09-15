<script>
	let { data, form } = $props();
	const s = $derived(data.settings);
</script>

<h1>Lodge / Settings</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="muted">Saved.</p>
{/if}

<form method="POST" class="form-card wide stack">
	<input type="hidden" name="csrf" value={data.csrf} />
	<div class="field-grid">
		<div class="field">
			<label for="name">Lodge name</label>
			<input id="name" name="name" value={s.name} required />
		</div>
		<div class="field">
			<label for="number">Number</label>
			<input id="number" name="number" value={s.number} />
		</div>
		<div class="field">
			<label for="obedience">Obedience</label>
			<input id="obedience" name="obedience" value={s.obedience} />
		</div>
		<div class="field">
			<label for="upcomingWeeks">Upcoming window (weeks)</label>
			<input id="upcomingWeeks" name="upcomingWeeks" type="number" min="1" max="52" value={s.upcomingWeeks} />
		</div>
		<div class="field">
			<label for="contactEmail">Contact email</label>
			<input id="contactEmail" name="contactEmail" type="email" value={s.contactEmail} />
		</div>
		<div class="field">
			<label for="contactPhone">Contact phone</label>
			<input id="contactPhone" name="contactPhone" value={s.contactPhone} />
		</div>
		<div class="field field-full">
			<label for="address">Address</label>
			<textarea id="address" name="address">{s.address}</textarea>
		</div>
		<div class="field field-full">
			<label for="logoUrl">Logo URL (optional static asset)</label>
			<input id="logoUrl" name="logoUrl" value={s.logoUrl} />
		</div>
		<div class="field">
			<label for="accent">Accent (light)</label>
			<input id="accent" name="accent" type="color" value={s.theme.accent} />
		</div>
		<div class="field">
			<label for="accentDark">Accent (dark)</label>
			<input id="accentDark" name="accentDark" type="color" value={s.theme.accentDark} />
		</div>
	</div>

	<h2>Terminology</h2>
	<div class="field-grid">
		<div class="field">
			<label for="termBrother">Brother</label>
			<input id="termBrother" name="termBrother" value={s.terminology.brother} />
		</div>
		<div class="field">
			<label for="termSister">Sister</label>
			<input id="termSister" name="termSister" value={s.terminology.sister} />
		</div>
		<div class="field">
			<label for="termSpouse">Spouse</label>
			<input id="termSpouse" name="termSpouse" value={s.terminology.spouse} />
		</div>
		<div class="field">
			<label for="termChild">Child</label>
			<input id="termChild" name="termChild" value={s.terminology.child} />
		</div>
		<div class="field">
			<label for="termSon">Son</label>
			<input id="termSon" name="termSon" value={s.terminology.son} />
		</div>
		<div class="field">
			<label for="termDaughter">Daughter</label>
			<input id="termDaughter" name="termDaughter" value={s.terminology.daughter} />
		</div>
		<div class="field">
			<label for="termIllustrious">Illustrious prefix</label>
			<input id="termIllustrious" name="termIllustrious" value={s.terminology.illustrious} />
		</div>
	</div>
	<button type="submit">Save settings</button>
</form>
