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
  // ==========================================
  // REFACCIONES
  // ==========================================

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

  // ==========================================
  // CLIENTES
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      fechaRegistro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_clientes_nombre
    ON clientes(nombre)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_clientes_telefono
    ON clientes(telefono)
  `);

  // ==========================================
  // COTIZACIONES
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT NOT NULL UNIQUE,
      clienteId INTEGER NOT NULL,
      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'Pendiente',
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      observaciones TEXT DEFAULT '',
      FOREIGN KEY (clienteId)
        REFERENCES clientes(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_cotizaciones_cliente
    ON cotizaciones(clienteId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_cotizaciones_estado
    ON cotizaciones(estado)
  `);

  // ==========================================
  // DETALLE DE COTIZACIONES
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS cotizacion_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacionId INTEGER NOT NULL,
      numeroParte TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      cantidad REAL NOT NULL DEFAULT 1,
      precioUnitario REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (cotizacionId)
        REFERENCES cotizaciones(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_cotizacion_detalle_cotizacion
    ON cotizacion_detalle(cotizacionId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_cotizacion_detalle_numeroParte
    ON cotizacion_detalle(numeroParte)
  `);

  // ==========================================
  // HISTORIAL PERMANENTE
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS historial_pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      clienteId INTEGER,
      nombreCliente TEXT NOT NULL DEFAULT '',
      telefonoCliente TEXT NOT NULL DEFAULT '',

      cotizacionId INTEGER,
      folioCotizacion TEXT DEFAULT '',

      numeroParte TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',

      cantidad REAL NOT NULL DEFAULT 1,
      precioUnitario REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,

      estado TEXT NOT NULL DEFAULT 'Pendiente',

      FOREIGN KEY (clienteId)
        REFERENCES clientes(id),

      FOREIGN KEY (cotizacionId)
        REFERENCES cotizaciones(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_historial_fecha
    ON historial_pedidos(fecha)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_historial_numeroParte
    ON historial_pedidos(numeroParte)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_historial_cliente
    ON historial_pedidos(nombreCliente)
  `);
});

module.exports = db;