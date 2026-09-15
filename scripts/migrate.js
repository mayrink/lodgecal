import { databasePath, getDb } from '../src/lib/server/db.js';

const db = getDb();
console.log(`Migrations applied. Database: ${databasePath()}`);
db.close();
