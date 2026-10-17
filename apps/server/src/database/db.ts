/**
 * NaviSecret Hybrid Database Engine
 * Automatic High-Availability: Connects to PostgreSQL 16 when available,
 * and transparently fails over to embedded resilient SQLite engine when PostgreSQL / Docker is offline.
 * Author & Owner: Ersin Sandal (SliferSoft)
 */
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let postgresHealthy: boolean | null = null;
let sqliteDb: DatabaseSync | null = null;

function getSqliteDb(): DatabaseSync {
  if (sqliteDb) return sqliteDb;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataDir = join(__dirname, '../../data');

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'navisecret_local.sqlite');
  sqliteDb = new DatabaseSync(dbPath);

  // Initialize SQLite schema
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE,
      display_name TEXT,
      avatar_url TEXT,
      status_emoji TEXT DEFAULT '👋',
      status_text TEXT DEFAULT 'Using NaviSecret',
      status_expires_at TEXT,
      is_casper INTEGER DEFAULT 0,
      casper_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      friend_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'accepted',
      can_view_location INTEGER DEFAULT 1,
      share_expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE (user_id, friend_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      update_interval_sec INTEGER DEFAULT 5,
      notifications_bumps INTEGER DEFAULT 1,
      notifications_reactions INTEGER DEFAULT 1,
      notifications_requests INTEGER DEFAULT 1,
      notifications_chat INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      place_type TEXT DEFAULT 'other',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL DEFAULT 100.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_groups (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      creator_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_group_members (
      group_id TEXT NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      room_type TEXT DEFAULT 'direct',
      group_id TEXT REFERENCES social_groups(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_room_members (
      room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      last_read_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS secret_capsules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      creator_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      geohash TEXT NOT NULL,
      title TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      salt_entropy TEXT NOT NULL,
      unlock_radius_m REAL DEFAULT 50.0,
      requires_passcode INTEGER DEFAULT 0,
      passcode_hint TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unveiled_territories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      cell_token TEXT NOT NULL,
      visit_count INTEGER DEFAULT 1,
      first_visited_at TEXT DEFAULT (datetime('now')),
      last_visited_at TEXT DEFAULT (datetime('now')),
      UNIQUE (user_id, cell_token)
    );

    CREATE TABLE IF NOT EXISTS pulse_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      initiator_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      peer_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      distance_meters REAL,
      pulsed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expressive_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      message TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safe schema migrations for existing local databases
  try {
    sqliteDb.exec(`ALTER TABLE pulse_history ADD COLUMN pulsed_at TEXT DEFAULT (datetime('now'));`);
  } catch {}
  try {
    sqliteDb.exec(`ALTER TABLE secret_capsules ADD COLUMN requires_passcode INTEGER DEFAULT 0;`);
  } catch {}
  try {
    sqliteDb.exec(`ALTER TABLE secret_capsules ADD COLUMN passcode_hint TEXT;`);
  } catch {}

  console.log(`[Database] Resilient embedded SQLite storage initialized at: ${dbPath}`);
  return sqliteDb;
}

function runSqliteQuery<T = any>(text: string, params: any[] = []): T[] {
  const db = getSqliteDb();

  // Convert PostgreSQL SQL syntax to SQLite and accurately map repeated $n parameters
  const positionalParams: any[] = [];
  let sql = text
    .replace(/\$(\d+)/g, (_, numStr) => {
      const idx = parseInt(numStr, 10) - 1;
      const val = params[idx];
      positionalParams.push(val === undefined ? null : val);
      return '?';
    })
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bILIKE\b/gi, 'LIKE');

  const trimmed = sql.trim().toUpperCase();
  const stmt = db.prepare(sql);

  if (trimmed.startsWith('SELECT') || sql.includes('RETURNING')) {
    const rows = stmt.all(...positionalParams);
    return rows as T[];
  } else {
    stmt.run(...positionalParams);
    return [] as T[];
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  // If PostgreSQL was already confirmed healthy, use it
  if (postgresHealthy === true) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(text, params);
        return res.rows as T[];
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[Database] PostgreSQL query error, falling back to SQLite:', err.message);
      postgresHealthy = false;
      return runSqliteQuery<T>(text, params);
    }
  }

  // If PostgreSQL was not tested yet, try once
  if (postgresHealthy === null) {
    try {
      const client = await pool.connect();
      client.release();
      postgresHealthy = true;
      console.log('[Database] PostgreSQL connected successfully on port 5433');
      const res = await pool.query(text, params);
      return res.rows as T[];
    } catch {
      postgresHealthy = false;
      console.warn('[Database] PostgreSQL not reachable. Operating in resilient embedded SQLite mode.');
      return runSqliteQuery<T>(text, params);
    }
  }

  // Fallback mode is active
  return runSqliteQuery<T>(text, params);
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
