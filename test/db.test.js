import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createRepository, openDatabase } from "../db.js";

function createMemoryRepository(t) {
  const repository = createRepository(new Database(":memory:"));
  t.after(() => repository.close());
  return repository;
}

test("starts with an empty entries table", (t) => {
  const repository = createMemoryRepository(t);

  assert.deepEqual(repository.listEntries(), []);
});

test("creates and retrieves an entry", (t) => {
  const repository = createMemoryRepository(t);
  const entry = repository.createEntry({
    title: "Title",
    author: "Author",
    content: "Content",
  });

  assert.equal(entry.id, 1);
  assert.equal(entry.title, "Title");
  assert.equal(entry.author, "Author");
  assert.equal(entry.content, "Content");
  assert.deepEqual(repository.getEntry(entry.id), entry);
});

test("lists entries in id order", (t) => {
  const repository = createMemoryRepository(t);

  repository.createEntry({ title: "First", author: "A", content: "1" });
  repository.createEntry({ title: "Second", author: "B", content: "2" });
  repository.createEntry({ title: "Third", author: "C", content: "3" });

  assert.deepEqual(
    repository.listEntries().map((entry) => entry.title),
    ["First", "Second", "Third"]
  );
});

test("updates only the requested entry", (t) => {
  const repository = createMemoryRepository(t);
  const first = repository.createEntry({
    title: "First",
    author: "A",
    content: "1",
  });
  const second = repository.createEntry({
    title: "Second",
    author: "B",
    content: "2",
  });

  const changes = repository.updateEntry(first.id, {
    title: "Updated",
    author: "New Author",
    content: "New content",
  });

  assert.equal(changes, 1);
  assert.equal(repository.getEntry(first.id).title, "Updated");
  assert.equal(repository.getEntry(second.id).title, "Second");
});

test("deletes only the requested entry", (t) => {
  const repository = createMemoryRepository(t);
  const first = repository.createEntry({
    title: "First",
    author: "A",
    content: "1",
  });
  const second = repository.createEntry({
    title: "Second",
    author: "B",
    content: "2",
  });

  assert.equal(repository.deleteEntry(first.id), 1);
  assert.equal(repository.getEntry(first.id), undefined);
  assert.equal(repository.getEntry(second.id).title, "Second");
});

test("returns no changes for missing ids", (t) => {
  const repository = createMemoryRepository(t);

  assert.equal(
    repository.updateEntry(999, { title: "T", author: "A", content: "C" }),
    0
  );
  assert.equal(repository.deleteEntry(999), 0);
  assert.equal(repository.getEntry(999), undefined);
});

test("persists entries across database reopen", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "web-blog-db-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const dbPath = join(directory, "blog.db");
  const repository = openDatabase(dbPath);
  const created = repository.createEntry({
    title: "Persisted",
    author: "Author",
    content: "Content",
  });
  repository.close();

  const reopened = openDatabase(dbPath);

  try {
    assert.equal(reopened.getEntry(created.id).title, "Persisted");
  } finally {
    reopened.close();
  }
});
