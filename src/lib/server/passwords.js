import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { TEMP_PASSWORD_BYTES } from '../constants.js';

const ARGON2_OPTIONS = {
	type: argon2.argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1
};

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
	return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * @param {string} hash
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(hash, password) {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

/**
 * Cryptographically secure temporary password. Never derived from phone numbers.
 * @returns {string}
 */
export function generateTemporaryPassword() {
	return randomBytes(TEMP_PASSWORD_BYTES).toString('base64url');
}

/**
 * @param {string} password
 * @returns {string | null} error message or null if ok
 */
export function validatePasswordStrength(password) {
	if (typeof password !== 'string' || password.length < 10) {
		return 'Password must be at least 10 characters.';
	}
	return null;
}
