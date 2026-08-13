const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const databaseDirectory =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  __dirname;

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, {
    recursive: true,
  });
}

const databasePath = path.join(
  databaseDirectory,
  "inventario.db"
);

console.log(
  "📦 Base de datos:",
  databasePath
);

const db = new sqlite3.Database(
  databasePath,
  (error) => {
    if (error) {
      console.error(
        "❌ Error al conectar la base de datos:",
        error.message
      );

      return;
    }

    console.log(
      "✅ Base de datos conectada."
    );
  }
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS refacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numeroParte TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL DEFAULT '',
      modelo TEXT DEFAULT '',
      anio TEXT DEFAULT '',
      existencias REAL DEFAULT 0,
      ubicacion TEXT DEFAULT '',
      precio REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_refacciones_descripcion
    ON refacciones(descripcion)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_refacciones_modelo
    ON refacciones(modelo)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_refacciones_ubicacion
    ON refacciones(ubicacion)
  `);
});

module.exports = db;