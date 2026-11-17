import { PERSON_STATUS, RELATIONSHIPS, ROLES } from '../src/lib/constants.js';
import { getDb, transaction } from '../src/lib/server/db.js';
import { hashPassword } from '../src/lib/server/passwords.js';
import { addHouseholdMember, insertPerson } from '../src/lib/server/repos/people.js';
import { getLodgeSettings, updateLodgeSettings } from '../src/lib/server/repos/settings.js';
import { countUsers, insertUser, markSetupComplete } from '../src/lib/server/repos/users.js';
import { createEvent, getEventTypeByKey } from '../src/lib/server/events.js';

const db = getDb();

if (countUsers(db) > 0) {
	console.log('Seed skipped: users already exist.');
	process.exit(0);
}

const passwordHash = await hashPassword('ChangeMe-demo-1');

transaction(db, () => {
	const settings = getLodgeSettings(db);
	updateLodgeSettings(db, {
		...settings,
		name: 'Demo Lodge',
		number: '1',
		obedience: 'DEMO'
	});

	const adminPerson = insertPerson(db, {
		fullName: 'Admin Demo',
		gender: 'MALE',
		birthDate: '1975-04-12',
		email: 'admin@example.com',
		phone: null,
		status: PERSON_STATUS.ACTIVE
	});
	insertUser(db, {
		personId: adminPerson,
		passwordHash,
		role: ROLES.ADMIN,
		mustChangePassword: false
	});

	const brotherPerson = insertPerson(db, {
		fullName: 'John Smith',
		gender: 'MALE',
		birthDate: '1982-06-20',
		email: 'john@example.com',
		phone: null,
		status: PERSON_STATUS.ACTIVE
	});
	const brotherUser = insertUser(db, {
		personId: brotherPerson,
		passwordHash,
		role: ROLES.USER,
		mustChangePassword: false
	});
	const spouse = insertPerson(db, {
		fullName: 'Mary Smith',
		gender: 'FEMALE',
		birthDate: '1984-11-03',
		email: null,
		phone: null,
		status: PERSON_STATUS.ACTIVE
	});
	addHouseholdMember(db, brotherUser, spouse, RELATIONSHIPS.SPOUSE);

	const leap = insertPerson(db, {
		fullName: 'Leap Year Brother',
		gender: 'MALE',
		birthDate: '1988-02-29',
		email: 'leap@example.com',
		phone: null,
		status: PERSON_STATUS.ACTIVE
	});
	insertUser(db, {
		personId: leap,
		passwordHash,
		role: ROLES.USER,
		mustChangePassword: true
	});

	const wedding = getEventTypeByKey(db, 'wedding_anniversary');
	createEvent(db, {
		eventTypeId: wedding.id,
		title: 'Smith wedding',
		isoDate: '2010-05-20',
		recurring: true,
		personIds: [brotherPerson, spouse]
	});

	markSetupComplete(db);
});

console.log('Demo seed complete.');
console.log('Admin: admin@example.com / ChangeMe-demo-1');
console.log('User: john@example.com / ChangeMe-demo-1');
db.close();
