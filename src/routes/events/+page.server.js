import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { createEvent, getEventType, listEventTypes } from '$lib/server/events.js';
import { csrfError, formNumberList } from '$lib/server/forms.js';
import { archiveEvent, listEvents } from '$lib/server/repos/events.js';
import { listPeople } from '$lib/server/repos/people.js';
import { asString } from '$lib/server/validation.js';
import { isValidIsoDate } from '$lib/dates.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	return {
		csrf: locals.csrf,
		events: listEvents(locals.db),
		types: listEventTypes(locals.db).filter((t) => !t.derived),
		people: listPeople(locals.db, { includeInactive: true })
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const title = asString(form.get('title'));
		const isoDate = asString(form.get('isoDate'));
		const eventTypeId = Number(asString(form.get('eventTypeId')));
		const details = asString(form.get('details'));
		const recurring = asString(form.get('recurring')) === 'on';
		if (!title) return fail(400, { error: 'Title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid ISO date is required.' });
		const type = getEventType(locals.db, eventTypeId);
		if (!type || type.derived) return fail(400, { error: 'Invalid event type.' });
		const created = createEvent(locals.db, {
			eventTypeId,
			title,
			isoDate,
			details,
			recurring,
			personIds: formNumberList(form, 'personIds')
		});
		if (!created.ok) return fail(400, { error: created.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_create',
			entityType: 'event',
			entityId: created.id,
			summary: `${type.label}: ${title} on ${isoDate}${created.ok && recurring ? ' (recurring)' : ''}`
		});
		redirect(303, '/events');
	},

	archive: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('eventId')));
		archiveEvent(locals.db, id);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_archive',
			entityType: 'event',
			entityId: id,
			summary: 'Archived event'
		});
		return { saved: true };
	}
};
