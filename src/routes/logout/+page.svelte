<script>
	let { data } = $props();
</script>

<form method="POST" class="form-card stack">
	<input type="hidden" name="csrf" value={data.csrf} />
	<p>Sign out of LodgeCal?</p>
	<button type="submit">Log out</button>
</form>
