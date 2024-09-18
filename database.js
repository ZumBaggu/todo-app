// database.js
const sqlite3 = require("sqlite3").verbose();
const { Pool, Client } = require("pg");
require("dotenv").config();

const dbType = process.env.DB_TYPE || "sqlite";

let db;

// Funktion zum Erstellen der PostgreSQL-Datenbank, falls sie nicht existiert
async function createDatabaseIfNotExists() {
  const client = new Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'todo';`
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE todo;`);
      console.log("Datenbank 'todo' erstellt.");
    } else {
      console.log("Datenbank 'todo' existiert bereits.");
    }
  } catch (err) {
    console.error("Fehler beim Erstellen der Datenbank:", err);
  } finally {
    await client.end();
  }
}

// Hauptlogik zum Verbinden mit der Datenbank und Erstellen der Tabellen
async function initializeDatabase() {
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
    // Erst sicherstellen, dass die Datenbank existiert
    await createDatabaseIfNotExists();

    // Mit der 'todo'-Datenbank verbinden
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
    `
    ).catch((err) => console.error("Error creating table:", err));
  }
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

// Initialisierung der Datenbank
initializeDatabase().then(() => {
  console.log("Datenbank initialisiert");
});

module.exports = { all, run };
