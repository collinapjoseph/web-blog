import fs from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { initializeSchema } from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);
const requiredFields = ["title", "author", "content"];

export function readEntriesFile(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON file not found: ${jsonPath}`);
  }

  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch (err) {
    throw new Error(`Could not parse ${jsonPath}: ${err.message}`);
  }

  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`${jsonPath} must contain an "entries" array`);
  }

  return parsed.entries.map((entry, index) => {
    const location = `entries[${index}]`;

    if (!entry || typeof entry !== "object") {
      throw new Error(`${location} must be an object`);
    }

    for (const field of requiredFields) {
      if (typeof entry[field] !== "string") {
        throw new Error(`${location}.${field} must be a string`);
      }
    }

    return {
      title: entry.title,
      author: entry.author,
      content: entry.content,
    };
  });
}

export function migrateJsonToSqlite({ jsonPath, dbPath, force = false }) {
  // Validate everything before opening the database so bad input cannot
  // leave a partially migrated file behind.
  const entries = readEntriesFile(jsonPath);
  const db = new Database(dbPath);

  try {
    db.pragma("journal_mode = WAL");
    initializeSchema(db);

    const existing = db
      .prepare("SELECT COUNT(*) AS count FROM entries")
      .get().count;

    if (existing > 0 && !force) {
      throw new Error(
        `Refusing to migrate: ${dbPath} already contains ${existing} entries. ` +
          "Re-run with --force to replace them."
      );
    }

    const insertStmt = db.prepare(`
      INSERT INTO entries (id, title, author, content)
      VALUES (?, ?, ?, ?)
    `);

    const migrate = db.transaction(() => {
      if (force) {
        db.prepare("DELETE FROM entries").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'entries'").run();
      }

      // Preserve the old array index as the id so existing /read?id=N links
      // continue to point at the same entry after migration.
      entries.forEach((entry, index) => {
        insertStmt.run(index, entry.title, entry.author, entry.content);
      });
    });

    migrate();

    return { imported: entries.length, dbPath };
  } finally {
    db.close();
  }
}

function getOption(args, name, fallback) {
  const index = args.indexOf(name);

  if (index === -1) {
    return fallback;
  }

  if (!args[index + 1]) {
    throw new Error(`${name} requires a value`);
  }

  return args[index + 1];
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(
      "Usage: node scripts/migrate-json-to-sqlite.js " +
        "[--file blogEntries.json] [--db blog.db] [--force]"
    );
    return;
  }

  try {
    const jsonPath = resolve(
      getOption(args, "--file", join(projectRoot, "blogEntries.json"))
    );
    const dbPath = resolve(
      getOption(args, "--db", join(projectRoot, "blog.db"))
    );
    const { imported } = migrateJsonToSqlite({
      jsonPath,
      dbPath,
      force: args.includes("--force"),
    });

    console.log(`Imported ${imported} entries from ${jsonPath} into ${dbPath}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
