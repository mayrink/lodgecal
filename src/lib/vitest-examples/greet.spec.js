import { describe, expect, it } from 'vitest';
import { honorificName, itemContext } from '../display.js';

describe('display terminology', () => {
	const terms = { brother: 'Bro∴', sister: 'Sis∴', spouse: 'Spouse', daughter: 'Daughter' };

	it('uses Lodge terminology without inferring gender from relation', () => {
		const spouse = { full_name: 'Helena Mayrink', gender: 'FEMALE' };
		const owner = { full_name: 'Georges Mayrink', gender: 'MALE' };
		expect(honorificName(owner, terms)).toBe('Bro∴ Georges Mayrink');
		expect(
			itemContext(
				{ kind: 'birthday', person: spouse, owner, relationship: 'SPOUSE' },
				terms
			)
		).toBe('Spouse of Bro∴ Georges Mayrink');
	});

	it('does not repeat a standalone birthday subject in its context line', () => {
		const person = { full_name: 'Georges Mayrink', gender: 'MALE' };
		expect(itemContext({ kind: 'birthday', person, typeLabel: 'Birthday' }, terms)).toBe('Birthday');
	});
});
