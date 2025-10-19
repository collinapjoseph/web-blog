import express from "express";
import fs from "node:fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __blogDataFilePath = `${__dirname}/blogEntries-samples.json`;
// const __blogEntriesFilePath = `${__dirname}/blogEntries.json`;
const app = express();
const port = 3000;

var blogData = loadBlogData();

app.use(express.static("public"));
app.use(express.json())
app.use(express.urlencoded({extended:true}));

app.get("/", (req, res)=>{
    res.render("index.ejs", {blogEntries:blogData['entries']});
});

app.get("/read", (req, res)=>{
    var id = req.query['p']
    console.log(id);
    // access blog entry
    var entry = blogData['entries'][id]
    // display to client
    res.render("read.ejs", {blogEntry:entry});
});

app.get("/write", (req, res)=>{
    res.render("write.ejs");
});

app.delete("/", (req, res)=>{
    // remove item from blogEntries
    // save blogEntries
    saveBlogEntries(blogData);
    // confirm deleted
    // redirect/reload home
});

app.post("/submit", (req, res)=>{
    var newEntry = req.body;
    newEntry['id'] = getNewEntryID();
    blogData['entries'].push(newEntry);
    saveBlogEntries(blogData);
    res.redirect("/");
});

app.listen(port, (err)=>{
    if(err) throw err;
    console.log(`Server listening at http:\\localhost:${port}`);
});

function loadBlogData(){
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

function saveBlogEntries(data){
    fs.writeFileSync(__blogDataFilePath, JSON.stringify(data, null, 2), "utf-8");
}

function getNewEntryID(){
    var maxId = 0;
    for(var i=0;i<blogData.length;i++){
        if(blogData[i]['id'] > maxId){ maxId = blogData[i]['id']; }
    }
    return maxId+1;
}