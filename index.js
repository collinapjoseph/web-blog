import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.BLOG_DB_PATH || join(__dirname, "blog.db");
const port = Number(process.env.PORT || 3000);

const repository = openDatabase(dbPath);
const app = createApp({ repository });

const server = app.listen(port, (err) => {
  if (err) throw err;
  console.log(`Server listening at http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    repository.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
