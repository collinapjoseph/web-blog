import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { migrateJsonToSqlite } from "../scripts/migrate-json-to-sqlite.js";

const sampleEntries = [
  { title: "One", author: "Ada", content: "First" },
  { title: "Two", author: "Grace", content: "Second" },
  { title: "Three", author: "Linus", content: "Third" },
];

function createWorkspace(t) {
  const directory = mkdtempSync(join(tmpdir(), "web-blog-migrate-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  return {
    jsonPath: join(directory, "blogEntries.json"),
    dbPath: join(directory, "blog.db"),
  };
}

function writeEntries(jsonPath, entries) {
  writeFileSync(jsonPath, JSON.stringify({ entries }), "utf-8");
}

function readRows(dbPath) {
  const db = new Database(dbPath, { readonly: true });

  try {
    return db
      .prepare("SELECT id, title, author, content FROM entries ORDER BY id")
      .all();
  } finally {
    db.close();
  }
}

test("imports entries in order and preserves array indexes as ids", (t) => {
  const { jsonPath, dbPath } = createWorkspace(t);
  writeEntries(jsonPath, sampleEntries);

  const result = migrateJsonToSqlite({ jsonPath, dbPath });

  assert.equal(result.imported, 3);

  const rows = readRows(dbPath);
  assert.deepEqual(
    rows.map((row) => row.id),
    [0, 1, 2]
  );
  assert.deepEqual(
    rows.map((row) => row.title),
    ["One", "Two", "Three"]
  );
  assert.deepEqual(rows[1], {
    id: 1,
    title: "Two",
    author: "Grace",
    content: "Second",
  });
});

test("refuses to migrate into a non-empty database", (t) => {
  const { jsonPath, dbPath } = createWorkspace(t);
  writeEntries(jsonPath, sampleEntries);
  migrateJsonToSqlite({ jsonPath, dbPath });

  assert.throws(
    () => migrateJsonToSqlite({ jsonPath, dbPath }),
    /already contains 3 entries/
  );
  assert.equal(readRows(dbPath).length, 3);
});

test("--force replaces existing entries", (t) => {
  const { jsonPath, dbPath } = createWorkspace(t);
  writeEntries(jsonPath, sampleEntries);
  migrateJsonToSqlite({ jsonPath, dbPath });

  writeEntries(jsonPath, [
    { title: "Replacement", author: "New", content: "Only entry" },
  ]);
  const result = migrateJsonToSqlite({ jsonPath, dbPath, force: true });

  assert.equal(result.imported, 1);
  assert.deepEqual(readRows(dbPath), [
    {
      id: 0,
      title: "Replacement",
      author: "New",
      content: "Only entry",
    },
  ]);
});

test("malformed JSON fails without touching an existing database", (t) => {
  const { jsonPath, dbPath } = createWorkspace(t);
  writeEntries(jsonPath, sampleEntries);
  migrateJsonToSqlite({ jsonPath, dbPath });

  writeFileSync(jsonPath, "{ this is not json", "utf-8");

  assert.throws(
    () => migrateJsonToSqlite({ jsonPath, dbPath, force: true }),
    /Could not parse/
  );
  assert.equal(readRows(dbPath).length, 3);
});

test("missing fields fail before a database is created", (t) => {
  const { jsonPath, dbPath } = createWorkspace(t);
  writeEntries(jsonPath, [{ title: "Incomplete", author: "Ada" }]);

  assert.throws(
    () => migrateJsonToSqlite({ jsonPath, dbPath }),
    /entries\[0\]\.content must be a string/
  );
  assert.equal(existsSync(dbPath), false);
});
