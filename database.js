// database.js
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");
require("dotenv").config();

const dbType = process.env.DB_TYPE || "sqlite";

let db;

if (dbType === "sqlite") {
  db = new sqlite3.Database("todos.db");

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL
      )
    `);
  });
} else if (dbType === "postgres") {
  db = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: "todo",
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  db.query(
    `
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL
    )
  `,
  ).catch((err) => console.error("Error creating table:", err));
}

// Wrapper-Funktionen für einheitliche Datenbankoperationen
function all(sql, params) {
  return new Promise((resolve, reject) => {
    if (dbType === "sqlite") {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else if (dbType === "postgres") {
      db.query(sql, params)
        .then((res) => resolve(res.rows))
        .catch((err) => reject(err));
    }
  });
}

function run(sql, params) {
  return new Promise((resolve, reject) => {
    if (dbType === "sqlite") {
      db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          const lastID = this.lastID;
          db.get("SELECT * FROM todos WHERE id = ?", [lastID], (err, row) => {
            if (err) reject(err);
            else resolve({ row: row, changes: this.changes });
          });
        }
      });
    } else if (dbType === "postgres") {
      db.query(sql, params)
        .then((res) => {
          resolve({ row: res.rows[0], changes: res.rowCount });
        })
        .catch((err) => reject(err));
    }
  });
}

module.exports = { all, run };
