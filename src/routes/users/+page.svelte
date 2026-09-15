<script>
	import PersonForm from '$lib/components/PersonForm.svelte';
	let { data, form } = $props();
</script>

<h1>Users</h1>
{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}
{#if form?.generatedPassword}
	<p class="error" role="status">
		Temporary password for {form.newUserEmail}: <code>{form.generatedPassword}</code>
		— share it once. It will not be shown again.
	</p>
{/if}

<table>
	<thead>
		<tr>
			<th>Name</th>
			<th>Email</th>
			<th>Role</th>
			<th>Must change password</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.users as user}
			<tr>
				<td>{user.full_name}</td>
				<td>{user.email}</td>
				<td>
					<form method="POST" action="?/role">
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="userId" value={user.id} />
						<select name="role" onchange={(e) => e.currentTarget.form.requestSubmit()}>
							<option value="USER" selected={user.role === 'USER'}>USER</option>
							<option value="ADMIN" selected={user.role === 'ADMIN'}>ADMIN</option>
						</select>
					</form>
				</td>
				<td>{user.must_change_password ? 'Yes' : 'No'}</td>
				<td>
					<form method="POST" action="?/resetPassword">
						<input type="hidden" name="csrf" value={data.csrf} />
						<input type="hidden" name="userId" value={user.id} />
						<button class="secondary" type="submit">Reset password</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<section class="form-card" style="margin-top:1.5rem">
	<h2>Create account</h2>
	<form method="POST" action="?/create" class="stack">
		<PersonForm csrf={data.csrf} emailRequired={true} showSubmit={false} />
		<label for="role">Role</label>
		<select id="role" name="role">
			<option value="USER">USER</option>
			<option value="ADMIN">ADMIN</option>
		</select>
		<button type="submit">Create user</button>
	</form>
</section>
