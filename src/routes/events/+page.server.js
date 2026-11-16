import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { createEvent, getEventType } from '$lib/server/events.js';
import { csrfError } from '$lib/server/forms.js';
import { archiveEvent, reactivateEvent, updateEvent } from '$lib/server/repos/events.js';
import { asString } from '$lib/server/validation.js';
import { isValidIsoDate } from '$lib/dates.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	redirect(303, '/admin?tab=events');
}

function readEventForm(form) {
	return {
		title: asString(form.get('title')),
		isoDate: asString(form.get('isoDate')),
		eventTypeId: Number(asString(form.get('eventTypeId'))),
		details: asString(form.get('details')),
		personName: asString(form.get('personName')),
		recurring: asString(form.get('recurring')) === 'on'
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const { title, isoDate, eventTypeId, details, personName, recurring } = readEventForm(form);
		if (!title) return fail(400, { error: 'Title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid ISO date is required.' });
		const type = getEventType(locals.db, eventTypeId);
		if (!type || type.derived) return fail(400, { error: 'Invalid event type.' });
		const created = createEvent(locals.db, {
			eventTypeId,
			title,
			isoDate,
			details,
			personName,
			recurring
		});
		if (!created.ok) return fail(400, { error: created.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_create',
			entityType: 'event',
			entityId: created.id,
			summary: `${type.label}: ${title} on ${isoDate}${recurring ? ' (recurring)' : ''}`
		});
		return { saved: true };
	},

	update: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		const { title, isoDate, eventTypeId, details, personName, recurring } = readEventForm(form);
		if (!title) return fail(400, { error: 'Title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid ISO date is required.' });
		const type = getEventType(locals.db, eventTypeId);
		if (!type || type.derived) return fail(400, { error: 'Invalid event type.' });
		const updated = updateEvent(
			locals.db,
			id,
			{ eventTypeId, title, isoDate, details, personName, recurring },
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
		return { saved: true };
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
	},

	reactivate: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('eventId')));
		reactivateEvent(locals.db, id);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_reactivate',
			entityType: 'event',
			entityId: id,
			summary: 'Reactivated event'
		});
		return { saved: true };
	}
};
