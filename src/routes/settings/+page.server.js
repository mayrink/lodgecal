import { fail } from '@sveltejs/kit';
import { DEFAULT_UPCOMING_WEEKS } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { getLodgeSettings, updateLodgeSettings } from '$lib/server/repos/settings.js';
import { asString, isValidUpcomingWeeks } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	return { csrf: locals.csrf, settings: getLodgeSettings(locals.db) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const upcomingWeeks = Number(asString(form.get('upcomingWeeks')) || DEFAULT_UPCOMING_WEEKS);
		if (!isValidUpcomingWeeks(upcomingWeeks)) {
			return fail(400, { error: 'Upcoming window must be between 1 and 52 weeks.' });
		}
		const current = getLodgeSettings(locals.db);
		const next = {
			...current,
			name: asString(form.get('name')) || 'Lodge',
			number: asString(form.get('number')),
			obedience: asString(form.get('obedience')),
			contactEmail: asString(form.get('contactEmail')),
			contactPhone: asString(form.get('contactPhone')),
			address: asString(form.get('address')),
			logoUrl: asString(form.get('logoUrl')),
			upcomingWeeks,
			theme: {
				...current.theme,
				accent: asString(form.get('accent')) || current.theme.accent,
				accentDark: asString(form.get('accentDark')) || current.theme.accentDark
			},
			terminology: {
				...current.terminology,
				brother: asString(form.get('termBrother')) || current.terminology.brother,
				sister: asString(form.get('termSister')) || current.terminology.sister,
				spouse: asString(form.get('termSpouse')) || current.terminology.spouse,
				child: asString(form.get('termChild')) || current.terminology.child,
				son: asString(form.get('termSon')) || current.terminology.son,
				daughter: asString(form.get('termDaughter')) || current.terminology.daughter,
				illustrious: asString(form.get('termIllustrious')) || current.terminology.illustrious
			}
		};
		updateLodgeSettings(locals.db, next);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'settings_update',
			entityType: 'lodge',
			entityId: 1,
			summary: `Updated lodge settings (${next.name})`
		});
		return { saved: true };
	}
};
