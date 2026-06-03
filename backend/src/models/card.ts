import { Database, SqlValue } from 'sql.js';

export interface Card {
  id: string;
  title: string;
  description?: string;
  position: number;
  column_id: string;
  board_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCardInput {
  title: string;
  description?: string;
  column_id: string;
  board_id: string;
  created_by?: string;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  position?: number;
}

export class CardModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  create(input: CreateCardInput): Card {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const position = this.getNextPosition(input.column_id);

    const stmt = this.db.prepare(`
      INSERT INTO cards (id, title, description, position, column_id, board_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.bind([id, input.title, input.description || null, position, input.column_id, input.board_id, input.created_by || null, now, now]);
    stmt.step();
    stmt.free();

    return {
      id,
      title: input.title,
      description: input.description,
      position,
      column_id: input.column_id,
      board_id: input.board_id,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    };
  }

  getById(cardId: string): Card | null {
    const stmt = this.db.prepare('SELECT * FROM cards WHERE id = ?');
    stmt.bind([cardId]);
    
    let result: Card | null = null;
    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      result = this.rowToCard(row);
    }
    stmt.free();
    
    return result;
  }

  getByColumnId(columnId: string): Card[] {
    const stmt = this.db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC');
    stmt.bind([columnId]);

    const results: Card[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push(this.rowToCard(row));
    }
    stmt.free();

    return results;
  }

  getByBoardId(boardId: string): Card[] {
    const stmt = this.db.prepare('SELECT * FROM cards WHERE board_id = ? ORDER BY position ASC');
    stmt.bind([boardId]);

    const results: Card[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push(this.rowToCard(row));
    }
    stmt.free();

    return results;
  }

  update(cardId: string, input: UpdateCardInput): Card | null {
    const card = this.getById(cardId);
    if (!card) return null;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: SqlValue[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.position !== undefined) {
      updates.push('position = ?');
      values.push(input.position);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(cardId);

    const stmt = this.db.prepare(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`);
    stmt.bind(values);
    stmt.step();
    stmt.free();

    return this.getById(cardId);
  }

  delete(cardId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM cards WHERE id = ?');
    stmt.bind([cardId]);
    stmt.step();
    const changes = this.db.getRowsModified();
    stmt.free();
    
    return changes > 0;
  }

  private getNextPosition(columnId: string): number {
    const stmt = this.db.prepare('SELECT MAX(position) as maxPos FROM cards WHERE column_id = ?');
    stmt.bind([columnId]);
    
    let maxPos = -1;
    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      maxPos = (row.maxPos as number) ?? -1;
    }
    stmt.free();
    
    return maxPos + 1;
  }

  private rowToCard(row: Record<string, unknown>): Card {
    return {
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) || undefined,
      position: row.position as number,
      column_id: row.column_id as string,
      board_id: row.board_id as string,
      created_by: (row.created_by as string | null) || undefined,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
