import { fail } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { listEventTypes } from '$lib/server/events.js';
import { csrfError, slugKey } from '$lib/server/forms.js';
import { insertEventType, setEventTypeActive, updateEventType } from '$lib/server/repos/events.js';
import { asString } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	return { csrf: locals.csrf, types: listEventTypes(locals.db) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const label = asString(form.get('label'));
		if (!label) return fail(400, { error: 'Label is required.' });
		const key = slugKey(label);
		try {
			const id = insertEventType(locals.db, {
				key,
				label,
				allowsRecurrence: asString(form.get('allowsRecurrence')) === 'on'
			});
			recordAudit(locals.db, {
				actorUserId: admin.id,
				actorEmail: locals.person?.email,
				action: 'event_type_create',
				entityType: 'event_type',
				entityId: id,
				summary: `Created event type ${label}`
			});
		} catch {
			return fail(400, { error: 'An event type with that key already exists.' });
		}
		return { saved: true };
	},

	update: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		const label = asString(form.get('label'));
		if (!label) return fail(400, { error: 'Label is required.' });
		updateEventType(locals.db, id, {
			label,
			allowsRecurrence: asString(form.get('allowsRecurrence')) === 'on'
		});
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_type_update',
			entityType: 'event_type',
			entityId: id,
			summary: `Updated event type ${label}`
		});
		return { saved: true };
	},

	archive: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		setEventTypeActive(locals.db, id, false);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_type_archive',
			entityType: 'event_type',
			entityId: id,
			summary: `Archived event type ${id}`
		});
		return { saved: true };
	},

	reactivate: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		setEventTypeActive(locals.db, id, true);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'event_type_reactivate',
			entityType: 'event_type',
			entityId: id,
			summary: `Reactivated event type ${id}`
		});
		return { saved: true };
	}
};
