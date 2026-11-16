import { fail } from '@sveltejs/kit';
import {
	DEFAULT_UPCOMING_WEEKS,
	PERSON_STATUS,
	RELATIONSHIPS,
	ROLES
} from '$lib/constants.js';
import {
	addWeeks,
	ageOn,
	formatDateLongYear,
	formatDateShortYear,
	formatDayMonthShort,
	isValidIsoDate,
	plainDate,
	today
} from '$lib/dates.js';
import { childLabel, honorificName } from '$lib/display.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { createEvent, getEventType, listEventTypes } from '$lib/server/events.js';
import { csrfError, slugKey } from '$lib/server/forms.js';
import { generateTemporaryPassword, hashPassword } from '$lib/server/passwords.js';
import {
	archiveEvent,
	insertEventType,
	listEvents,
	reactivateEvent,
	setEventTypeActive,
	updateEvent,
	updateEventType
} from '$lib/server/repos/events.js';
import {
	correctKnowledge,
	getKnowledgeById,
	insertKnowledge,
	retireKnowledge
} from '$lib/server/repos/knowledge.js';
import {
	addHouseholdMember,
	endHouseholdMembership,
	getPersonByEmail,
	getPersonById,
	insertPerson,
	listAdminBrothersWithFamilies,
	listPeople,
	setPersonStatus,
	updatePerson
} from '$lib/server/repos/people.js';
import { getLodgeSettings, updateLodgeSettings } from '$lib/server/repos/settings.js';
import {
	getUserById,
	insertUser,
	purgeBrotherAndFamily,
	restoreDeletedUser,
	setTemporaryPassword,
	setUserRole
} from '$lib/server/repos/users.js';
import { deleteUserSessions } from '$lib/server/sessions.js';
import {
	asString,
	isValidEmail,
	isValidRole,
	isValidUpcomingWeeks,
	normalizeEmail,
	validatePersonInput
} from '$lib/server/validation.js';

function formatFamilyRole(member, terminology) {
	if (member.relationship === 'SPOUSE') {
		if (member.gender === 'FEMALE') return 'Wife';
		if (member.gender === 'MALE') return 'Husband';
		return terminology?.spouse || 'Spouse';
	}
	return childLabel(member, terminology);
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	requireAdmin(locals);
	const settings = getLodgeSettings(locals.db);
	const terminology = settings?.terminology ?? {};
	const todayPlain = today();

	const rawBrothers = listAdminBrothersWithFamilies(locals.db);
	const brothers = rawBrothers.map((b) => ({
		userId: b.user_id,
		personId: b.person_id,
		role: b.role,
		mustChangePassword: Boolean(b.must_change_password),
		fullName: b.full_name,
		displayName: honorificName(b, terminology),
		gender: b.gender,
		birthDate: b.birth_date,
		birthShort: formatDayMonthShort(b.birth_date),
		age: ageOn(b.birth_date, todayPlain),
		email: b.email || '',
		phone: b.phone || '',
		status: b.person_status,
		sleeping: b.person_status !== 'ACTIVE',
		knowledge: b.knowledge.map((k) => ({
			...k,
			dateFormatted: formatDateShortYear(k.effective_date)
		})),
		family: b.family.map((f) => ({
			membershipId: f.membership_id,
			personId: f.person_id,
			relationship: f.relationship,
			relationLabel: formatFamilyRole(f, terminology),
			fullName: f.full_name,
			gender: f.gender,
			birthDate: f.birth_date,
			birthShort: formatDayMonthShort(f.birth_date),
			age: ageOn(f.birth_date, todayPlain),
			email: f.email || '',
			phone: f.phone || '',
			hasAccount: f.hasAccount,
			knowledge: f.knowledge.map((k) => ({
				...k,
				dateFormatted: formatDateShortYear(k.effective_date)
			}))
		}))
	}));

	const events = listEvents(locals.db).map((e) => ({
		...e,
		dateFormatted: formatDateShortYear(e.iso_date),
		recurringBool: Boolean(e.recurring),
		repLabel: e.recurring ? 'Every year' : 'One time'
	}));

	const allTypes = listEventTypes(locals.db);
	const activeTypes = allTypes.filter((t) => !t.derived && t.is_active);
	const allPeopleNames = listPeople(locals.db, { includeInactive: false }).map((p) => p.full_name);

	const initialTab = url.searchParams.get('tab') || 'members';
	const untilPlain = addWeeks(todayPlain, settings?.upcomingWeeks ?? DEFAULT_UPCOMING_WEEKS);

	return {
		csrf: locals.csrf,
		today: todayPlain.toString(),
		initialTab,
		brothers,
		events,
		types: activeTypes,
		allTypes: allTypes.filter((t) => !t.derived),
		peopleNames: allPeopleNames,
		settings,
		untilFormatted: formatDateLongYear(untilPlain)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	createBrother: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });

		const role = asString(form.get('role')).toUpperCase() || ROLES.USER;
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });

		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || 'MALE',
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email || !isValidEmail(parsed.value.email)) {
			return fail(400, { error: 'A Brother account requires a valid email login.' });
		}
		parsed.value.email = normalizeEmail(parsed.value.email);

		const existing = locals.db
			.prepare(
				`SELECT p.id AS person_id, u.id AS user_id, u.deleted_at
				 FROM people p
				 LEFT JOIN users u ON u.person_id = p.id
				 WHERE p.email = ?`
			)
			.get(parsed.value.email);
		if (existing?.user_id && !existing.deleted_at) {
			return fail(400, { error: 'An account with that email already exists.' });
		}

		const temp = generateTemporaryPassword();
		const passwordHash = await hashPassword(temp);
		const createAccount = locals.db.transaction(() => {
			const personId = existing?.person_id ?? insertPerson(locals.db, parsed.value);
			if (existing?.person_id) updatePerson(locals.db, personId, parsed.value);
			if (existing?.user_id) {
				restoreDeletedUser(locals.db, existing.user_id, { passwordHash, role });
				return { userId: existing.user_id, restored: true };
			}
			const userId = insertUser(locals.db, {
				personId,
				passwordHash,
				role,
				mustChangePassword: true
			});
			return { personId, userId, restored: false };
		});
		const { userId, restored } = createAccount();
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: restored ? 'user_restore' : 'user_create',
			entityType: 'user',
			entityId: userId,
			summary: `${restored ? 'Restored' : 'Created'} ${role} account for ${parsed.value.email}`
		});
		return { saved: true, generatedPassword: temp, newUserEmail: parsed.value.email };
	},

	updateBrother: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		const role = asString(form.get('role')).toUpperCase() || user.role;
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });

		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || 'MALE',
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: asString(form.get('status')) || user.person_status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email || !isValidEmail(parsed.value.email)) {
			return fail(400, { error: 'A valid email login is required.' });
		}
		parsed.value.email = normalizeEmail(parsed.value.email);

		if (
			user.id === admin.id &&
			(role !== ROLES.ADMIN || parsed.value.status !== PERSON_STATUS.ACTIVE)
		) {
			return fail(400, { error: 'You cannot remove your own administrator access.' });
		}
		const duplicate = getPersonByEmail(locals.db, parsed.value.email);
		if (duplicate && duplicate.id !== user.person_id) {
			return fail(400, { error: 'Another person already uses that email address.' });
		}

		const save = locals.db.transaction(() => {
			updatePerson(locals.db, user.person_id, parsed.value);
			setUserRole(locals.db, userId, role);
		});
		save();
		if (parsed.value.status !== PERSON_STATUS.ACTIVE) deleteUserSessions(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_update',
			entityType: 'user',
			entityId: userId,
			summary: `Updated account for ${parsed.value.email}`
		});
		return { saved: true };
	},

	toggleSleep: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		if (user.id === admin.id && user.person_status === PERSON_STATUS.ACTIVE) {
			return fail(400, { error: 'You cannot mark your own account as sleeping.' });
		}
		const nextStatus =
			user.person_status === PERSON_STATUS.ACTIVE
				? PERSON_STATUS.INACTIVE
				: PERSON_STATUS.ACTIVE;
		setPersonStatus(locals.db, user.person_id, nextStatus);
		if (nextStatus !== PERSON_STATUS.ACTIVE) deleteUserSessions(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: nextStatus === PERSON_STATUS.ACTIVE ? 'user_reactivate' : 'user_archive',
			entityType: 'user',
			entityId: userId,
			summary: `Set ${user.email} status to ${nextStatus}`
		});
		return { saved: true };
	},

	resetPassword: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		const temp = generateTemporaryPassword();
		const passwordHash = await hashPassword(temp);
		setTemporaryPassword(locals.db, userId, passwordHash);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_password_reset',
			entityType: 'user',
			entityId: userId,
			summary: `Temporary password issued for ${user.email}`
		});
		return { saved: true, generatedPassword: temp, newUserEmail: user.email };
	},

	deleteBrother: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		if (user.id === admin.id) {
			return fail(400, { error: 'You cannot delete your own account.' });
		}
		const purged = purgeBrotherAndFamily(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_delete',
			entityType: 'user',
			entityId: userId,
			summary: `Purged account and household for ${user.email} (${purged?.deletedPeopleCount ?? 1} records)`
		});
		return { saved: true };
	},

	addFamilyMember: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const relationChoice = asString(form.get('relationChoice') || 'Wife');

		let relationship = RELATIONSHIPS.CHILD;
		let gender = asString(form.get('gender')).toUpperCase();
		if (relationChoice === 'Wife') {
			relationship = RELATIONSHIPS.SPOUSE;
			if (!gender) gender = 'FEMALE';
		} else if (relationChoice === 'Husband' || relationChoice === 'Spouse') {
			relationship = RELATIONSHIPS.SPOUSE;
			if (!gender) gender = relationChoice === 'Husband' ? 'MALE' : 'OTHER';
		} else if (relationChoice === 'Son') {
			relationship = RELATIONSHIPS.CHILD;
			if (!gender) gender = 'MALE';
		} else if (relationChoice === 'Daughter') {
			relationship = RELATIONSHIPS.CHILD;
			if (!gender) gender = 'FEMALE';
		} else {
			relationship = RELATIONSHIPS.CHILD;
			if (!gender) gender = 'OTHER';
		}

		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender,
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const personId = insertPerson(locals.db, parsed.value);
		const attached = addHouseholdMember(locals.db, userId, personId, relationship);
		if (!attached.ok) return fail(400, { error: attached.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'household_member_create',
			entityType: 'person',
			entityId: personId,
			summary: `Admin added ${relationship.toLowerCase()} ${parsed.value.fullName} to user ${userId}`
		});
		return { saved: true };
	},

	updateFamilyMember: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		const before = getPersonById(locals.db, personId);
		if (!before) return fail(404, { error: 'Person not found.' });
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || before.gender,
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updatePerson(locals.db, personId, parsed.value);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'person_update',
			entityType: 'person',
			entityId: personId,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	removeFamilyMember: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const membershipId = Number(asString(form.get('membershipId')));
		if (!membershipId) return fail(400, { error: 'Missing membership.' });
		endHouseholdMembership(locals.db, membershipId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'relationship_end',
			entityType: 'household_membership',
			entityId: membershipId,
			summary: 'Ended household relationship'
		});
		return { saved: true };
	},

	addNote: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate')) || today().toString();
		if (!body) return fail(400, { error: 'Note text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		const id = insertKnowledge(locals.db, {
			personId,
			body,
			effectiveDate,
			authorUserId: admin.id
		});
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: id,
			summary: `Admin added note for person ${personId}`
		});
		return { saved: true };
	},

	editNote: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		const entry = getKnowledgeById(locals.db, knowledgeId);
		if (!entry) return fail(404, { error: 'Note not found.' });
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate')) || entry.effective_date;
		if (!body) return fail(400, { error: 'Note text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		correctKnowledge(locals.db, knowledgeId, body, effectiveDate);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_update',
			entityType: 'knowledge',
			entityId: knowledgeId,
			summary: `Admin updated note ${knowledgeId}`
		});
		return { saved: true };
	},

	removeNote: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		retireKnowledge(locals.db, knowledgeId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_retire',
			entityType: 'knowledge',
			entityId: knowledgeId,
			summary: `Admin retired note ${knowledgeId}`
		});
		return { saved: true };
	},

	createEvent: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const title = asString(form.get('title'));
		const isoDate = asString(form.get('isoDate'));
		const eventTypeId = Number(asString(form.get('eventTypeId')));
		const details = asString(form.get('details'));
		const personName = asString(form.get('personName'));
		const recurring =
			asString(form.get('recurring')) === 'on' ||
			asString(form.get('repeats')) === 'annual';

		if (!title) return fail(400, { error: 'Event title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid date is required.' });
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
			summary: `${type.label}: ${title} on ${isoDate}`
		});
		return { saved: true };
	},

	updateEvent: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		const title = asString(form.get('title'));
		const isoDate = asString(form.get('isoDate'));
		const eventTypeId = Number(asString(form.get('eventTypeId')));
		const details = asString(form.get('details'));
		const personName = asString(form.get('personName'));
		const recurring =
			asString(form.get('recurring')) === 'on' ||
			asString(form.get('repeats')) === 'annual';

		if (!title) return fail(400, { error: 'Event title is required.' });
		if (!isValidIsoDate(isoDate)) return fail(400, { error: 'A valid date is required.' });
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

	archiveEvent: async ({ request, locals }) => {
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

	reactivateEvent: async ({ request, locals }) => {
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
	},

	createEventType: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const label = asString(form.get('label'));
		if (!label) return fail(400, { error: 'Category label is required.' });
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
			return fail(400, { error: 'An event category with that name already exists.' });
		}
		return { saved: true };
	},

	updateEventType: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		const label = asString(form.get('label'));
		if (!label) return fail(400, { error: 'Category label is required.' });
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

	toggleEventType: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('id')));
		const active = asString(form.get('active')) === '1';
		setEventTypeActive(locals.db, id, active);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: active ? 'event_type_reactivate' : 'event_type_archive',
			entityType: 'event_type',
			entityId: id,
			summary: `${active ? 'Reactivated' : 'Archived'} event type ${id}`
		});
		return { saved: true };
	},

	saveSettings: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const upcomingWeeks = Number(
			asString(form.get('upcomingWeeks')) || DEFAULT_UPCOMING_WEEKS
		);
		if (!isValidUpcomingWeeks(upcomingWeeks)) {
			return fail(400, { error: 'Upcoming window must be between 1 and 52 weeks.' });
		}
		const current = getLodgeSettings(locals.db);
		const next = {
			...current,
			name: asString(form.get('name')) || current.name || 'Lodge',
			number: asString(form.get('number') ?? current.number),
			obedience: asString(form.get('obedience') ?? current.obedience),
			contactEmail: asString(form.get('contactEmail') ?? current.contactEmail),
			contactPhone: asString(form.get('contactPhone') ?? current.contactPhone),
			address: asString(form.get('address') ?? current.address),
			logoUrl: asString(form.get('logoUrl') ?? current.logoUrl),
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
				worshipful: asString(form.get('termWorshipful')) || current.terminology.worshipful,
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
