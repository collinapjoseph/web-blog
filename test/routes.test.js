import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import Database from "better-sqlite3";
import { createApp } from "../app.js";
import { createRepository } from "../db.js";

const sampleEntry = {
  title: "Hello World",
  author: "Ada Lovelace",
  content: "First line\nSecond line",
};

function createTestApp(t) {
  const repository = createRepository(new Database(":memory:"));
  t.after(() => repository.close());

  return { app: createApp({ repository }), repository };
}

test("GET / shows the empty state when there are no entries", async (t) => {
  const { app } = createTestApp(t);

  const response = await request(app).get("/").expect(200);

  assert.match(response.text, /No blog entries available/);
});

test("GET / lists entries and links to them by database id", async (t) => {
  const { app, repository } = createTestApp(t);
  const created = repository.createEntry(sampleEntry);

  const response = await request(app).get("/").expect(200);

  assert.match(response.text, new RegExp(sampleEntry.title));
  assert.match(response.text, new RegExp(`/read\\?id=${created.id}`));
});

test("POST /submit creates an entry and redirects home", async (t) => {
  const { app, repository } = createTestApp(t);

  await request(app)
    .post("/submit")
    .type("form")
    .send(sampleEntry)
    .expect(302)
    .expect("Location", "/");

  const entries = repository.listEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, sampleEntry.title);
});

test("GET /read renders an entry", async (t) => {
  const { app, repository } = createTestApp(t);
  const created = repository.createEntry(sampleEntry);

  const response = await request(app)
    .get(`/read?id=${created.id}`)
    .expect(200);

  assert.match(response.text, /Hello World/);
  assert.match(response.text, /Ada Lovelace/);
  assert.match(response.text, /First line<br>Second line/);
});

test("GET /read returns 404 for unknown or invalid ids", async (t) => {
  const { app } = createTestApp(t);

  await request(app).get("/read?id=9999").expect(404);
  await request(app).get("/read?id=not-a-number").expect(404);
});

test("GET /edit renders the edit form with the update action", async (t) => {
  const { app, repository } = createTestApp(t);
  const created = repository.createEntry(sampleEntry);

  const response = await request(app)
    .get(`/edit?id=${created.id}`)
    .expect(200);

  assert.match(response.text, /Hello World/);
  assert.match(response.text, new RegExp(`action="/update/${created.id}"`));
});

test("GET /edit returns 404 for a missing entry", async (t) => {
  const { app } = createTestApp(t);

  await request(app).get("/edit?id=9999").expect(404);
});

test("POST /update/:id updates an entry", async (t) => {
  const { app, repository } = createTestApp(t);
  const created = repository.createEntry(sampleEntry);

  await request(app)
    .post(`/update/${created.id}`)
    .type("form")
    .send({
      title: "Updated title",
      author: "New author",
      content: "Updated content",
    })
    .expect(302)
    .expect("Location", "/");

  const updated = repository.getEntry(created.id);
  assert.equal(updated.title, "Updated title");
  assert.equal(updated.author, "New author");
  assert.equal(updated.content, "Updated content");
});

test("POST /update/:id returns 404 for a missing entry", async (t) => {
  const { app } = createTestApp(t);

  await request(app)
    .post("/update/9999")
    .type("form")
    .send(sampleEntry)
    .expect(404);
});

test("DELETE /:id removes an entry and returns 404 when it is gone", async (t) => {
  const { app, repository } = createTestApp(t);
  const created = repository.createEntry(sampleEntry);

  await request(app).delete(`/${created.id}`).expect(200);
  assert.equal(repository.getEntry(created.id), undefined);

  await request(app).delete(`/${created.id}`).expect(404);
});
