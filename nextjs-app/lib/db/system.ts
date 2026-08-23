import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDatabasePath(): string {
  const DATABASE_PATH = process.env.DATABASE_PATH || './data/system.db';
  return DATABASE_PATH;
}

// Ensure data directory exists
const dataDir = path.dirname(getDatabasePath());
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// A tenant is one organization: its people (users), and the event store
// holding its name, logo, trackers and issued mailbox. The mailbox name is
// mirrored here (from the account stream) purely for the UNIQUE constraint.
export interface Tenant {
  id: string;
  mailbox_local_part: string | null;
  created_at: number;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'member';
  must_change_password: number; // SQLite uses 0/1 for boolean
  created_at: number;
}

let db: Database.Database | null = null;

export function getSystemDb(): Database.Database {
  if (!db) {
    db = new Database(getDatabasePath());
    initializeSystemDb(db);
  }
  return db;
}

function initializeSystemDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      mailbox_local_part TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_mailbox_local_part
      ON tenants(mailbox_local_part) WHERE mailbox_local_part IS NOT NULL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      user_id TEXT,
      tenant_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

export function getUserByEmail(email: string): User | undefined {
  const db = getSystemDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  const db = getSystemDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUsersByTenant(tenantId: string): User[] {
  const db = getSystemDb();
  return db.prepare('SELECT * FROM users WHERE tenant_id = ?').all(tenantId) as User[];
}

/* Adds a person to an existing organization. The caller hashes the password
   first: better-sqlite3 is synchronous. */
export function createUser(user: {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'member';
  must_change_password: number;
}): void {
  const db = getSystemDb();
  db.prepare(`
    INSERT INTO users (id, tenant_id, email, password_hash, role, must_change_password, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.tenant_id, user.email.trim().toLowerCase(), user.password_hash, user.role, user.must_change_password, Date.now());
}

// Registration creates the tenant and its admin atomically. The password must
// be hashed by the caller first: better-sqlite3 transactions are synchronous.
export function createTenantWithAdmin(params: {
  tenantId: string;
  userId: string;
  email: string;
  passwordHash: string;
  mailboxLocalPart: string;
}): void {
  const db = getSystemDb();
  const now = Date.now();
  db.transaction(() => {
    db.prepare('INSERT INTO tenants (id, mailbox_local_part, created_at) VALUES (?, ?, ?)')
      .run(params.tenantId, params.mailboxLocalPart, now);
    db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, role, must_change_password, created_at)
      VALUES (?, ?, ?, ?, 'admin', 0, ?)
    `).run(params.userId, params.tenantId, params.email.trim().toLowerCase(), params.passwordHash, now);
  })();
}

/* The role that gates every request lives here beside the credentials, so
   authorization never has to replay a stream to answer "may they?". The
   organization's stream keeps the history of who changed it. */
export function updateUserRole(userId: string, role: 'admin' | 'member'): void {
  const db = getSystemDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
}

export function deleteUser(userId: string): void {
  const db = getSystemDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function countAdmins(tenantId: string): number {
  const db = getSystemDb();
  const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE tenant_id = ? AND role = 'admin'").get(tenantId) as { n: number };
  return row.n;
}

export function updateUserPassword(userId: string, newPasswordHash: string, mustChangePassword: number = 0): void {
  const db = getSystemDb();
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?')
    .run(newPasswordHash, mustChangePassword, userId);
}

export function getTenantIds(): string[] {
  const db = getSystemDb();
  const rows = db.prepare('SELECT id FROM tenants ORDER BY created_at').all() as Array<{ id: string }>;
  return rows.map(r => r.id);
}

export function tenantExists(id: string): boolean {
  const db = getSystemDb();
  return db.prepare('SELECT 1 FROM tenants WHERE id = ?').get(id) !== undefined;
}

export function isMailboxLocalPartTaken(localPart: string, exceptTenantId?: string): boolean {
  const db = getSystemDb();
  const row = db.prepare('SELECT id FROM tenants WHERE mailbox_local_part = ?').get(localPart.toLowerCase()) as { id: string } | undefined;
  return row !== undefined && row.id !== exceptTenantId;
}

// Throws on a UNIQUE violation, which is the race guard for a name two
// accounts pick at the same moment.
export function updateTenantMailboxLocalPart(tenantId: string, localPart: string): void {
  const db = getSystemDb();
  db.prepare('UPDATE tenants SET mailbox_local_part = ? WHERE id = ?').run(localPart.toLowerCase(), tenantId);
}

export interface FeedbackEntry {
  id: number;
  message: string;
  email: string | null; // null for anonymous (logged-out) submissions
  created_at: number;
}

export function insertFeedback(params: {
  message: string;
  userId: string | null;
  tenantId: string | null;
}): void {
  const db = getSystemDb();
  db.prepare(`
    INSERT INTO feedback (message, user_id, tenant_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(params.message, params.userId, params.tenantId, Date.now());
}

export function getAllFeedback(): FeedbackEntry[] {
  const db = getSystemDb();
  return db.prepare(`
    SELECT f.id, f.message, u.email, f.created_at
    FROM feedback f
    LEFT JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
    LIMIT 500
  `).all() as FeedbackEntry[];
}
