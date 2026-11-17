// Emergency recovery: reset a user's password from the server command line.
// Usage: pnpm reset-password <email> [new-password]
//
// Anyone who can run this already has shell access to the server and the database
// file, so it is as trusted as the SQLite file itself. If no password is given, a
// random temporary one is generated and printed. The user must change it at next login.
import { getDb } from '../src/lib/server/db.js';
import { recordAudit } from '../src/lib/server/audit.js';
import {
	generateTemporaryPassword,
	hashPassword,
	validatePasswordStrength
} from '../src/lib/server/passwords.js';
import { deleteUserSessions } from '../src/lib/server/sessions.js';
import { getUserByEmail, setTemporaryPassword } from '../src/lib/server/repos/users.js';
import { normalizeEmail } from '../src/lib/server/validation.js';

const [emailArg, passwordArg] = process.argv.slice(2);
if (!emailArg) {
	console.error('Usage: pnpm reset-password <email> [new-password]');
	process.exit(1);
}

const db = getDb();
const user = getUserByEmail(db, normalizeEmail(emailArg));
if (!user) {
	console.error(`No active user found with email ${emailArg}.`);
	db.close();
	process.exit(1);
}

const password = passwordArg ?? generateTemporaryPassword();
const error = validatePasswordStrength(password);
if (error) {
	console.error(error);
	db.close();
	process.exit(1);
}

setTemporaryPassword(db, user.id, await hashPassword(password));
deleteUserSessions(db, user.id);
recordAudit(db, {
	actorUserId: null,
	actorEmail: 'cli',
	action: 'user_password_reset',
	entityType: 'user',
	entityId: user.id,
	summary: `Password reset from command line for ${user.email}`
});

console.log(`Password reset for ${user.email}.`);
if (!passwordArg) console.log(`Temporary password: ${password}`);
console.log('The user must choose a new password at next login.');
db.close();
