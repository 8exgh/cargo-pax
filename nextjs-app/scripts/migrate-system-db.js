#!/usr/bin/env node
/**
 * System-database migrations, applied at container startup before the app
 * boots (see Dockerfile CMD). Safe to run repeatedly:
 *
 * - A __db_migration_history table records applied migrations by id;
 *   absence of a row means the migration runs, and the row is inserted in
 *   the same transaction as the migration itself.
 * - Migrations must tolerate fresh databases (the app's own
 *   CREATE TABLE IF NOT EXISTS creates the current schema on first boot).
 *
 * Local dev: node scripts/migrate-system-db.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATABASE_PATH = process.env.DATABASE_PATH || './data/system.db';

const MIGRATIONS = [
  // Never edit or reorder applied entries; append new ones.
  {
    // The @cargopax.ca name each account picked at registration, mirrored
    // from the account_created event for the UNIQUE constraint.
    id: '001-tenants-mailbox-local-part',
    run(db) {
      const table = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tenants'"
      ).get();
      if (!table) {
        return; // fresh database: app DDL creates the full schema
      }
      const columns = db.prepare('PRAGMA table_info(tenants)').all();
      if (!columns.some(c => c.name === 'mailbox_local_part')) {
        db.exec('ALTER TABLE tenants ADD COLUMN mailbox_local_part TEXT');
      }
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_mailbox_local_part
        ON tenants(mailbox_local_part) WHERE mailbox_local_part IS NOT NULL`);
    }
  }
];

function main() {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  const db = new Database(DATABASE_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS __db_migration_history (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const isApplied = db.prepare('SELECT 1 FROM __db_migration_history WHERE id = ?');
  const record = db.prepare('INSERT INTO __db_migration_history (id, applied_at) VALUES (?, ?)');

  for (const migration of MIGRATIONS) {
    if (isApplied.get(migration.id)) {
      console.log(`[migrate] ${migration.id}: already applied`);
      continue;
    }

    console.log(`[migrate] ${migration.id}: applying...`);
    db.transaction(() => {
      migration.run(db);
      record.run(migration.id, Date.now());
    })();
    console.log(`[migrate] ${migration.id}: applied`);
  }

  db.close();
  console.log(`[migrate] System database migrations complete (${DATABASE_PATH})`);
}

main();
