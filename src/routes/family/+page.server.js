import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import {
	ageOn,
	formatDateShortYear,
	formatDayMonthLong,
	plainDate,
	today
} from '$lib/dates.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import {
	correctKnowledge,
	getKnowledgeById,
	insertKnowledge,
	listKnowledge,
	retireKnowledge
} from '$lib/server/repos/knowledge.js';
import {
	addHouseholdMember,
	canAccessPerson,
	getHousehold,
	getPersonById,
	insertPerson,
	personHasUserAccount,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

function formatNotes(entries) {
	return entries.map((e) => ({
		id: e.id,
		body: e.body,
		effectiveDate: e.effective_date,
		dateFormatted: formatDateShortYear(e.effective_date),
		authorName: e.author_name
	}));
}

function relationDescription(member, terminology, isSelf) {
	if (isSelf) return 'You, brother of the lodge';
	if (member.relationship === 'SPOUSE') {
		if (member.gender === 'FEMALE') return 'Your wife';
		if (member.gender === 'MALE') return 'Your husband';
		return `Your ${(terminology?.spouse || 'spouse').toLowerCase()}`;
	}
	const age = ageOn(member.birth_date);
	let childWord = (terminology?.child || 'child').toLowerCase();
	if (member.gender === 'FEMALE') childWord = (terminology?.daughter || 'daughter').toLowerCase();
	if (member.gender === 'MALE') childWord = (terminology?.son || 'son').toLowerCase();
	return `Your ${childWord}, age ${age}`;
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	const terminology = locals.lodge?.terminology ?? {};
	const rawHousehold = getHousehold(locals.db, user.id);
	const selfPerson = getPersonById(locals.db, user.personId);
	const isAdmin = user.role === 'ADMIN';

	const childrenSorted = [...(rawHousehold?.children ?? [])].sort((a, b) =>
		(a.birth_date ?? '').localeCompare(b.birth_date ?? '')
	);

	const allMembers = [
		{
			...selfPerson,
			isSelf: true,
			relationship: 'SELF',
			hasAccount: true,
			age: isAdmin ? ageOn(selfPerson.birth_date) : null,
			relLabel: relationDescription(selfPerson, terminology, true),
			birthdayFormatted: formatDayMonthLong(selfPerson.birth_date),
			notes: formatNotes(listKnowledge(locals.db, selfPerson.id))
		},
		...(rawHousehold?.spouse
			? [
					{
						...rawHousehold.spouse,
						isSelf: false,
						relationship: 'SPOUSE',
						hasAccount: Boolean(rawHousehold.spouse.has_account),
						age: ageOn(rawHousehold.spouse.birth_date),
						relLabel: `${relationDescription(rawHousehold.spouse, terminology, false)}, age ${ageOn(rawHousehold.spouse.birth_date)}`,
						birthdayFormatted: formatDayMonthLong(rawHousehold.spouse.birth_date),
						notes: formatNotes(listKnowledge(locals.db, rawHousehold.spouse.id))
					}
				]
			: []),
		...childrenSorted.map((child) => ({
			...child,
			isSelf: false,
			relationship: 'CHILD',
			hasAccount: Boolean(child.has_account),
			age: ageOn(child.birth_date),
			relLabel: relationDescription({ ...child, relationship: 'CHILD' }, terminology, false),
			birthdayFormatted: formatDayMonthLong(child.birth_date),
			notes: formatNotes(listKnowledge(locals.db, child.id))
		}))
	];

	return {
		csrf: locals.csrf,
		isAdmin,
		today: today().toString(),
		hasSpouse: Boolean(rawHousehold?.spouse),
		members: allMembers,
		household: {
			spouse: rawHousehold?.spouse
				? { ...rawHousehold.spouse, hasAccount: Boolean(rawHousehold.spouse.has_account) }
				: null,
			children: childrenSorted.map((c) => ({ ...c, hasAccount: Boolean(c.has_account) }))
		}
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	saveSelf: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const before = getPersonById(locals.db, user.personId);
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || before.gender,
			birthDate: form.get('birthDate'),
			email: form.get('email') || before.email,
			phone: form.get('phone'),
			status: before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email) return fail(400, { error: 'Email is required for a User account.' });
		updatePerson(locals.db, user.personId, { ...parsed.value, status: before.status });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: parsed.value.email,
			action: 'person_update_self',
			entityType: 'person',
			entityId: user.personId,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	addMember: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const relationship = asString(form.get('relationship')).toUpperCase();
		if (relationship !== RELATIONSHIPS.SPOUSE && relationship !== RELATIONSHIPS.CHILD) {
			return fail(400, { error: 'Relationship must be spouse or child.' });
		}
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const personId = insertPerson(locals.db, parsed.value);
		const attached = addHouseholdMember(locals.db, user.id, personId, relationship);
		if (!attached.ok) return fail(400, { error: attached.error });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'household_member_create',
			entityType: 'person',
			entityId: personId,
			summary: `Added ${relationship.toLowerCase()} ${parsed.value.fullName}`
		});
		return { saved: true };
	},

	saveMember: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		const household = getHousehold(locals.db, user.id);
		const belongs =
			household?.spouse?.id === personId ||
			(household?.children ?? []).some((c) => c.id === personId);
		if (!belongs) {
			return fail(403, { error: 'You may only edit your own household members.' });
		}
		if (personHasUserAccount(locals.db, personId)) {
			return fail(403, { error: 'That person is a Lodge member and manages their own account.' });
		}
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
		updatePerson(locals.db, personId, { ...parsed.value, status: before.status });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'person_update_household',
			entityType: 'person',
			entityId: personId,
			summary: `Updated household member ${parsed.value.fullName}`
		});
		return { saved: true };
	},

	addNote: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		if (!canAccessPerson(locals.db, user, personId)) {
			return fail(403, { error: 'You may only add notes for your own household.' });
		}
		if (personId !== user.personId && personHasUserAccount(locals.db, personId)) {
			return fail(403, { error: 'That person is a Lodge member and manages their own notes.' });
		}
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
			authorUserId: user.id
		});
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: id,
			summary: `Added birthday note for person ${personId}`
		});
		return { saved: true };
	},

	editNote: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		const entry = getKnowledgeById(locals.db, knowledgeId);
		if (!entry || !canAccessPerson(locals.db, user, entry.person_id)) {
			return fail(404, { error: 'Note not found.' });
		}
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate')) || entry.effective_date;
		if (!body) return fail(400, { error: 'Note text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		correctKnowledge(locals.db, knowledgeId, body, effectiveDate);
		return { saved: true };
	},

	removeNote: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		const entry = getKnowledgeById(locals.db, knowledgeId);
		if (!entry || !canAccessPerson(locals.db, user, entry.person_id)) {
			return fail(404, { error: 'Note not found.' });
		}
		retireKnowledge(locals.db, knowledgeId);
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_retire',
			entityType: 'knowledge',
			entityId: knowledgeId,
			summary: `Removed birthday note ${knowledgeId}`
		});
		return { saved: true };
	}
};
