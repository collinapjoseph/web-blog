import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseId(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function entryFromBody(body = {}) {
  return {
    title: typeof body.title === "string" ? body.title : "",
    author: typeof body.author === "string" ? body.author : "",
    content: typeof body.content === "string" ? body.content : "",
  };
}

export function createApp({ repository }) {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", join(__dirname, "views"));
  app.use(express.static(join(__dirname, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (req, res) => {
    res.render("index.ejs", { blogEntries: repository.listEntries() });
  });

  app.get("/read", (req, res) => {
    const id = parseId(req.query["id"]);
    const entry = id === null ? undefined : repository.getEntry(id);

    if (!entry) {
      return res.status(404).send("Blog entry not found");
    }

    res.render("read.ejs", { blogEntry: entry, entryId: entry.id });
  });

  app.get("/write", (req, res) => {
    res.render("write.ejs");
  });

  app.post("/submit", (req, res) => {
    const newEntry = repository.createEntry(entryFromBody(req.body));
    res.redirect("/");
    console.log("Created entry:", newEntry["title"], "by", newEntry["author"]);
  });

  app.get("/edit", (req, res) => {
    const id = parseId(req.query["id"]);
    const entry = id === null ? undefined : repository.getEntry(id);

    if (!entry) {
      return res.status(404).send("Blog entry not found");
    }

    res.render("edit.ejs", { blogEntry: entry, entryId: entry.id });
    console.log("Edit entry:", entry["title"], "by", entry["author"]);
  });

  app.post("/update/:id", (req, res) => {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.sendStatus(404);
    }

    const changes = repository.updateEntry(id, entryFromBody(req.body));

    if (changes === 0) {
      return res.sendStatus(404);
    }

    res.redirect("/");
    console.log("Updated entry:", id);
  });

  app.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);

    if (id === null) {
      return res.sendStatus(404);
    }

    const entry = repository.getEntry(id);
    const changes = repository.deleteEntry(id);

    if (changes === 0) {
      return res.sendStatus(404);
    }

    res.sendStatus(200);
    console.log("Deleted entry:", entry["title"], "by", entry["author"]);
  });

  return app;
}
