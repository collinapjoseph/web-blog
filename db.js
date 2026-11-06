import Database from "better-sqlite3";

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    author     TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export function initializeSchema(db) {
  db.exec(SCHEMA);
}

export function createRepository(db) {
  initializeSchema(db);

  const listStmt = db.prepare(`
    SELECT id, title, author, content, created_at, updated_at
    FROM entries
    ORDER BY id ASC
  `);
  const getStmt = db.prepare(`
    SELECT id, title, author, content, created_at, updated_at
    FROM entries
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO entries (title, author, content)
    VALUES (@title, @author, @content)
  `);
  const updateStmt = db.prepare(`
    UPDATE entries
    SET title = @title,
        author = @author,
        content = @content,
        updated_at = datetime('now')
    WHERE id = @id
  `);
  const deleteStmt = db.prepare("DELETE FROM entries WHERE id = ?");

  return {
    listEntries() {
      return listStmt.all();
    },

    getEntry(id) {
      return getStmt.get(id);
    },

    createEntry({ title, author, content }) {
      const result = insertStmt.run({ title, author, content });
      return getStmt.get(result.lastInsertRowid);
    },

    updateEntry(id, { title, author, content }) {
      return updateStmt.run({ id, title, author, content }).changes;
    },

    deleteEntry(id) {
      return deleteStmt.run(id).changes;
    },

    close() {
      db.close();
    },
  };
}

export function openDatabase(filename) {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return createRepository(db);
}
