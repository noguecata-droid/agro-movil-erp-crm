const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(DB_PATH);

function init() {
  db.serialize(() => {
    db.run(`PRAGMA foreign_keys = ON`);

    db.run(`
      CREATE TABLE IF NOT EXISTS farmers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ubicacion TEXT NOT NULL CHECK (ubicacion IN ('Carchi', 'Santo Domingo')),
        producto TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS containers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        tipo TEXT NOT NULL DEFAULT 'Reefer 40 pies',
        estado TEXT NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible','En uso','Mantenimiento')),
        ubicacion_actual TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_id INTEGER NOT NULL,
        container_id INTEGER,
        producto TEXT NOT NULL,
        kilos REAL NOT NULL CHECK (kilos > 0),
        tarifa_por_kg REAL NOT NULL DEFAULT 0.15,
        total_cobro REAL NOT NULL,
        fecha TEXT DEFAULT (datetime('now','localtime')),
        notas TEXT,
        FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
        FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL
      )
    `);
  });
}

module.exports = { db, init };
