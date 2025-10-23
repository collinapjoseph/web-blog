import express from "express";
import fs from "node:fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __blogDataFilePath = `${__dirname}/blogEntries.json`;
const app = express();
const port = 3000;

var blogData = loadBlogData();

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs", { blogEntries: blogData["entries"] });
});

app.get("/read", (req, res) => {
  var id = req.query["id"];
  var entry = blogData["entries"][id];
  res.render("read.ejs", { blogEntry: entry, entryId: id });
});

app.get("/write", (req, res) => {
  res.render("write.ejs");
});

app.post("/submit", (req, res) => {
  var newEntry = req.body;
  blogData["entries"].push(newEntry);
  saveBlogEntries(blogData);
  res.redirect("/");
  console.log("Created entry:", newEntry["title"], "by", newEntry["author"]);
});

app.get("/edit", (req, res) => {
  var id = req.query["id"];
  var entry = blogData["entries"][id];
  res.render("edit.ejs", { blogEntry: entry, entryId: id });
  console.log("Edit entry:", entry["title"], "by", entry["author"]);
});

app.post("/update:id", (req, res) => {
  var id = req.params.id;
  var newEntry = req.body;
  blogData["entries"][id] = newEntry;
  saveBlogEntries(blogData);
  res.redirect("/");
  console.log("Updated entry:", id);
});

app.delete("/:id", (req, res) => {
  var id = req.params.id;
  var deletedItems = blogData["entries"].splice(id, 1);
  saveBlogEntries(blogData);
  res.sendStatus(200);
  console.log(
    "Deleted entry:",
    deletedItems[0]["title"],
    "by",
    deletedItems[0]["author"]
  );
});

app.listen(port, (err) => {
  if (err) throw err;
  console.log(`Server listening at http:\\localhost:${port}`);
});

function loadBlogData() {
  if (fs.existsSync(__blogDataFilePath)) {
    const data = fs.readFileSync(__blogDataFilePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch (err) {
      console.error("Error parsing blogEntries.json:", err);
      return [];
    }
  } else {
    return [];
  }
}

function saveBlogEntries(data) {
  fs.writeFileSync(__blogDataFilePath, JSON.stringify(data, null, 2), "utf-8");
}
