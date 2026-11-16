/**
 * @param {object} person
 * @param {Record<string, string>} terminology
 * @returns {string}
 */
export function honorificName(person, terminology) {
	if (!person) return '';
	const name = (person.full_name || person.fullName || '').trim();
	const bro = terminology?.brother || 'Bro∴';
	const sis = terminology?.sister || 'Sis∴';
	if (name.startsWith(bro) || name.startsWith(sis) || /^Bro[.\u2234]\s/i.test(name)) {
		return name;
	}
	if (person.gender === 'FEMALE') return `${sis} ${name}`;
	if (person.gender === 'MALE') return `${bro} ${name}`;
	return name;
}

/**
 * @param {object} person
 * @param {Record<string, string>} terminology
 * @returns {string}
 */
export function childLabel(person, terminology) {
	if (person?.gender === 'FEMALE') return terminology.daughter || 'Daughter';
	if (person?.gender === 'MALE') return terminology.son || 'Son';
	return terminology.child || 'Child';
}

/**
 * Public context line for dashboard rows. Never includes age.
 * @param {{
 *   kind: string,
 *   person?: object,
 *   personName?: string,
 *   typeLabel?: string,
 *   owner?: object | null,
 *   relationship?: string | null
 * }} item
 * @param {Record<string, string>} terminology
 * @returns {string}
 */
export function itemContext(item, terminology) {
	if (item.kind === 'birthday') {
		if (item.owner && item.relationship === 'SPOUSE') {
			return `${terminology.spouse || 'Spouse'} of ${honorificName(item.owner, terminology)}`;
		}
		if (item.owner && item.relationship === 'CHILD') {
			return `${childLabel(item.person, terminology)} of ${honorificName(item.owner, terminology)}`;
		}
		return item.typeLabel || 'Birthday';
	}
	if (item.personName) {
		return `${item.typeLabel}: ${item.personName}`;
	}
	return item.typeLabel || 'Event';
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isInactiveStatus(status) {
	return status === 'INACTIVE' || status === 'DEPARTED';
}
