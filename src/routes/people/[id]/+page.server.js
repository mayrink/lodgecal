import { error, fail } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import {
	ageOn,
	formatDateShortYear,
	formatDayMonthLong,
	plainDate,
	today
} from '$lib/dates.js';
import { childLabel, honorificName } from '$lib/display.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
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
	endHouseholdMembership,
	getHouseholdForPerson,
	getPersonById,
	insertPerson,
	listHouseholdHeads,
	setPersonStatus,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

function formatNotes(entries) {
	return entries.map((e) => ({
		...e,
		effectiveDate: e.effective_date,
		dateFormatted: formatDateShortYear(e.effective_date)
	}));
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, params }) {
	requireAdmin(locals);
	const person = getPersonById(locals.db, Number(params.id));
	if (!person) error(404, 'Person not found.');
	const terminology = locals.lodge?.terminology ?? {};
	const userRow = locals.db
		.prepare('SELECT * FROM users WHERE person_id = ? AND deleted_at IS NULL')
		.get(person.id);
	const rawHousehold = getHouseholdForPerson(locals.db, person.id);

	const householdMembers = [];
	if (rawHousehold) {
		if (rawHousehold.spouse && rawHousehold.spouse.id !== person.id) {
			householdMembers.push({
				...rawHousehold.spouse,
				relationship: 'SPOUSE',
				relLabel:
					rawHousehold.spouse.gender === 'FEMALE'
						? 'Wife'
						: rawHousehold.spouse.gender === 'MALE'
							? 'Husband'
							: terminology.spouse || 'Spouse',
				age: ageOn(rawHousehold.spouse.birth_date),
				birthdayFormatted: formatDayMonthLong(rawHousehold.spouse.birth_date),
				notes: formatNotes(listKnowledge(locals.db, rawHousehold.spouse.id))
			});
		}
		for (const child of rawHousehold.children ?? []) {
			if (child.id === person.id) continue;
			householdMembers.push({
				...child,
				relationship: 'CHILD',
				relLabel: childLabel(child, terminology),
				age: ageOn(child.birth_date),
				birthdayFormatted: formatDayMonthLong(child.birth_date),
				notes: formatNotes(listKnowledge(locals.db, child.id))
			});
		}
	}

	return {
		csrf: locals.csrf,
		person: {
			...person,
			displayName: userRow ? honorificName(person, terminology) : person.full_name,
			birthdayFormatted: formatDayMonthLong(person.birth_date)
		},
		age: ageOn(person.birth_date),
		today: today().toString(),
		userRow,
		household: rawHousehold,
		householdMembers,
		knowledge: formatNotes(listKnowledge(locals.db, person.id, { includeRetired: false })),
		heads: listHouseholdHeads(locals.db)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(params.id);
		const before = getPersonById(locals.db, id);
		if (!before) error(404, 'Person not found.');
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || before.gender,
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: form.get('status') || before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updatePerson(locals.db, id, parsed.value);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'person_update',
			entityType: 'person',
			entityId: id,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	addFamilyMember: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(params.id);
		const userRow = locals.db
			.prepare('SELECT id FROM users WHERE person_id = ? AND deleted_at IS NULL')
			.get(personId);
		if (!userRow) return fail(400, { error: 'Only a Lodge Brother can head a household.' });

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
		const newId = insertPerson(locals.db, parsed.value);
		const attached = addHouseholdMember(locals.db, userRow.id, newId, relationship);
		if (!attached.ok) return fail(400, { error: attached.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'household_member_create',
			entityType: 'person',
			entityId: newId,
			summary: `Added ${relationship.toLowerCase()} ${parsed.value.fullName}`
		});
		return { saved: true };
	},

	endRelationship: async ({ request, locals }) => {
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

	addKnowledge: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const targetPersonId = Number(asString(form.get('personId')) || params.id);
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate')) || today().toString();
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		const id = insertKnowledge(locals.db, {
			personId: targetPersonId,
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
			summary: `Admin added knowledge for person ${targetPersonId}`
		});
		return { saved: true };
	},

	retireKnowledge: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		retireKnowledge(locals.db, id);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_retire',
			entityType: 'knowledge',
			entityId: id,
			summary: 'Retired knowledge entry'
		});
		return { saved: true };
	},

	editKnowledge: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate'));
		const entry = getKnowledgeById(locals.db, id);
		if (!entry) return fail(404, { error: 'Knowledge entry not found.' });
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		correctKnowledge(locals.db, id, body, effectiveDate);
		return { saved: true };
	},

	deleteKnowledge: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		retireKnowledge(locals.db, id);
		return { saved: true };
	}
};
