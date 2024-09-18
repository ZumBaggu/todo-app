// app.js
const express = require("express");
const app = express();
const path = require("path");
const { all, run } = require("./database");
require("dotenv").config();

const dbType = process.env.DB_TYPE || "sqlite";

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Todos anzeigen
app.get("/", async (req, res) => {
  try {
    const rows = await all(
      dbType === "sqlite" ? "SELECT * FROM todos" : "SELECT * FROM todos",
      [],
    );
    res.render("index", { todos: rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Serverfehler");
  }
});

// Todo hinzufügen
app.post("/add", async (req, res) => {
  const content = req.body.content;
  try {
    const sql =
      dbType === "sqlite"
        ? "INSERT INTO todos (content) VALUES (?)"
        : "INSERT INTO todos (content) VALUES ($1) RETURNING *";

    const params = [content];

    const result = await run(sql, params);
    const newTodo = result.row;

    res.render("partials/todo", { todo: newTodo });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Serverfehler");
  }
});

// Todo bearbeiten
app.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const content = req.body.content;
  try {
    const sql =
      dbType === "sqlite"
        ? "UPDATE todos SET content = ? WHERE id = ?"
        : "UPDATE todos SET content = $1 WHERE id = $2 RETURNING *";

    const params = dbType === "sqlite" ? [content, id] : [content, id];

    const result = await run(sql, params);
    let updatedTodo;

    if (dbType === "sqlite") {
      const rows = await all("SELECT * FROM todos WHERE id = ?", [id]);
      updatedTodo = rows[0];
    } else if (dbType === "postgres") {
      updatedTodo = result.row;
    }

    res.render("partials/todo", { todo: updatedTodo });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Serverfehler");
  }
});

// Todo löschen
app.post("/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const sql =
      dbType === "sqlite"
        ? "DELETE FROM todos WHERE id = ?"
        : "DELETE FROM todos WHERE id = $1";

    const params = [id];

    await run(sql, params);
    res.status(200).send(""); // Leere Antwort zurückgeben
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Serverfehler");
  }
});

// Server starten
app.listen(3001, () => {
  console.log("Server läuft auf http://localhost:3001");
});
