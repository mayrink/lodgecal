<script>
  import { sortableTable } from "$lib/sortable-table.js";
  let { data } = $props();
</script>

<div class="page-head">
  <h1>People</h1>
  <a class="button" href="/people/new">Add person</a>
</div>
<table use:sortableTable>
  <thead>
    <tr>
      <th>Name</th>
      <th>Gender</th>
      <th>Born</th>
      <th>Age</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {#each data.people as person}
      <tr class:inactive={person.status !== "ACTIVE"}>
        <td><a href="/people/{person.id}">{person.full_name}</a></td>
        <td>{person.gender}</td>
        <td>{person.birth_date}</td>
        <td>{person.age}</td>
        <td>{person.email || ""}</td>
        <td>{person.status}</td>
      </tr>
    {/each}
  </tbody>
</table>
