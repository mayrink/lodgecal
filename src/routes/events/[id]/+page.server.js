import { error, fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { getEventType, listEventTypes } from '$lib/server/events.js';
import { csrfError, formNumberList } from '$lib/server/forms.js';
import { getEventById, updateEvent } from '$lib/server/repos/events.js';
import { listPeople } from '$lib/server/repos/people.js';
import { asString } from '$lib/server/validation.js';
import { isValidIsoDate } from '$lib/dates.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, params }) {
	requireAdmin(locals);
	const event = getEventById(locals.db, Number(params.id));
	if (!event) error(404, 'Event not found.');
	return {
		csrf: locals.csrf,
		event,
		types: listEventTypes(locals.db).filter((t) => !t.derived),
		people: listPeople(locals.db, { includeInactive: true })
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(params.id);
		const title = asString(form.get('title'));
		const isoDate = asString(form.get('isoDate'));
		const eventTypeId = Number(asString(form.get('eventTypeId')));
		const details = asString(form.get('details'));
		const recurring = asString(form.get('recurring')) === 'on';
		const status = asString(form.get('status')) || 'ACTIVE';
		if (!title) return fail(400, { error: 'Title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid ISO date is required.' });
		const type = getEventType(locals.db, eventTypeId);
		if (!type || type.derived) return fail(400, { error: 'Invalid event type.' });
		const updated = updateEvent(
			locals.db,
			id,
			{
				eventTypeId,
				title,
				isoDate,
				details,
				recurring,
				status,
				personIds: formNumberList(form, 'personIds')
			},
			type
		);
		if (!updated.ok) return fail(400, { error: updated.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_update',
			entityType: 'event',
			entityId: id,
			summary: `${type.label}: ${title} on ${isoDate}`
		});
		redirect(303, '/events');
	}
};
