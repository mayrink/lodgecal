<script>
	let { data, form } = $props();
</script>

<h1>Event Types</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<table>
	<thead>
		<tr>
			<th>Key</th>
			<th>Label</th>
			<th>Recurrence</th>
			<th>System</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.types as type}
			<tr>
				<td><code>{type.key}</code></td>
				<td>
					{#if type.is_system}
						{type.label}
					{:else}
						<form method="POST" action="?/update" class="inline-form">
							<input type="hidden" name="csrf" value={data.csrf} />
							<input type="hidden" name="id" value={type.id} />
							<input name="label" value={type.label} required />
							<label>
								<input type="checkbox" name="allowsRecurrence" checked={Boolean(type.allows_recurrence)} />
								Annual
							</label>
							<button class="secondary" type="submit">Save</button>
						</form>
					{/if}
				</td>
				<td>{type.allows_recurrence ? 'Allowed' : 'Never'}</td>
				<td>{type.is_system ? 'Yes' : 'No'}{type.derived ? ' (derived)' : ''}</td>
				<td></td>
			</tr>
		{/each}
	</tbody>
</table>

<form method="POST" action="?/create" class="form-card stack" style="margin-top:1.5rem">
	<h2>Add type</h2>
	<input type="hidden" name="csrf" value={data.csrf} />
	<label for="label">Label</label>
	<input id="label" name="label" required />
	<label>
		<input type="checkbox" name="allowsRecurrence" />
		Allows annual recurrence
	</label>
	<button type="submit">Create type</button>
</form>
