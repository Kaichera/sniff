/**
 * Config storage for deployed agent configurations
 *
 * Stores YAML config in SQLite, similar to token storage.
 */

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

/**
 * Interface for config storage
 */
export interface ConfigStorage {
  get(): Promise<string | null>;
  set(yaml: string): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

/**
 * Get or create the SQLite database with config table
 */
function getDatabase(dbPath?: string): Database.Database {
  const defaultPath = join(homedir(), '.sniff', 'data.db');
  const path = dbPath || defaultPath;

  mkdirSync(join(homedir(), '.sniff'), { recursive: true });

  const db = new Database(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY DEFAULT 'default',
      yaml_content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  return db;
}

/**
 * SQLite-backed config storage
 */
export class SQLiteConfigStorage implements ConfigStorage {
  private db: Database.Database;
  private key: string;

  constructor(dbPath?: string, key: string = 'default') {
    this.db = getDatabase(dbPath);
    this.key = key;
  }

  async get(): Promise<string | null> {
    const row = this.db.prepare('SELECT yaml_content FROM config WHERE key = ?').get(this.key) as
      | { yaml_content: string }
      | undefined;

    return row?.yaml_content || null;
  }

  async set(yaml: string): Promise<void> {
    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO config (key, yaml_content, updated_at)
        VALUES (?, ?, ?)
      `,
      )
      .run(this.key, yaml, Date.now());
  }

  async clear(): Promise<void> {
    this.db.prepare('DELETE FROM config WHERE key = ?').run(this.key);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Create a SQLite config storage instance
 */
export function createConfigStorage(dbPath?: string, key?: string): SQLiteConfigStorage {
  return new SQLiteConfigStorage(dbPath, key);
}
