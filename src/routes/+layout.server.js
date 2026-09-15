/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals, url }) {
	return {
		user: locals.user,
		person: locals.person
			? {
					id: locals.person.id,
					fullName: locals.person.fullName,
					email: locals.person.email,
					gender: locals.person.gender,
					status: locals.person.status
				}
			: null,
		lodge: locals.lodge,
		csrf: locals.csrf,
		path: url.pathname
	};
}
