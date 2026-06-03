import initSqlJs, { Database } from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  db = new SQL.Database();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const migrationPath = join(__dirname, '../../migrations/001_create_cards.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  db.run(migrationSql);

  const now = new Date().toISOString();
  const boardId = '00000000-0000-4000-a000-000000000001';
  db.run(
    `INSERT OR IGNORE INTO columns (id, name, board_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['00000000-0000-4000-a000-000000000010', 'To Do', boardId, now, now],
  );
  db.run(
    `INSERT OR IGNORE INTO columns (id, name, board_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['00000000-0000-4000-a000-000000000020', 'In Progress', boardId, now, now],
  );
  db.run(
    `INSERT OR IGNORE INTO columns (id, name, board_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['00000000-0000-4000-a000-000000000030', 'Done', boardId, now, now],
  );

  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
