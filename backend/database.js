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

      motivoRechazo TEXT DEFAULT '',
      detalleMotivoRechazo TEXT DEFAULT '',

      modeloVehiculo TEXT DEFAULT '',
      anioVehiculo TEXT DEFAULT '',
      versionVehiculo TEXT DEFAULT '',
      vinVehiculo TEXT DEFAULT '',

      operacionInstalacion TEXT DEFAULT '',
      tiempoInstalacion REAL DEFAULT 0,
      fuenteTiempo TEXT DEFAULT '',
      conceptosAdicionales TEXT DEFAULT '',

      interesaTomaCuenta INTEGER NOT NULL DEFAULT 0,
      interesaPromociones INTEGER NOT NULL DEFAULT 0,

      FOREIGN KEY (clienteId)
        REFERENCES clientes(id)
    )
  `);

  // ==========================================
  // MIGRACIONES DE COTIZACIONES
  // ==========================================

  db.all(
    `PRAGMA table_info(cotizaciones)`,
    [],
    (error, columnas) => {
      if (error) {
        console.error(
          "❌ No se pudo revisar la tabla cotizaciones:",
          error.message
        );

        return;
      }

      const nombresColumnas =
        columnas.map(
          (columna) => columna.name
        );

      // ======================================
      // MOTIVOS DE RECHAZO
      // ======================================

      if (
        !nombresColumnas.includes(
          "motivoRechazo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN motivoRechazo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando motivoRechazo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna motivoRechazo agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "detalleMotivoRechazo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN detalleMotivoRechazo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando detalleMotivoRechazo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna detalleMotivoRechazo agregada."
            );
          }
        );
      }

      // ======================================
      // DATOS DEL VEHÍCULO
      // ======================================

      if (
        !nombresColumnas.includes(
          "modeloVehiculo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN modeloVehiculo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando modeloVehiculo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna modeloVehiculo agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "anioVehiculo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN anioVehiculo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando anioVehiculo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna anioVehiculo agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "versionVehiculo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN versionVehiculo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando versionVehiculo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna versionVehiculo agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "vinVehiculo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN vinVehiculo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando vinVehiculo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna vinVehiculo agregada."
            );
          }
        );
      }

      // ======================================
      // INSTALACIÓN SUZUKI TOLUCA
      // ======================================

      if (
        !nombresColumnas.includes(
          "operacionInstalacion"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN operacionInstalacion TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando operacionInstalacion:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna operacionInstalacion agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "tiempoInstalacion"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN tiempoInstalacion REAL DEFAULT 0
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando tiempoInstalacion:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna tiempoInstalacion agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "fuenteTiempo"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN fuenteTiempo TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando fuenteTiempo:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna fuenteTiempo agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "conceptosAdicionales"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN conceptosAdicionales TEXT DEFAULT ''
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando conceptosAdicionales:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna conceptosAdicionales agregada."
            );
          }
        );
      }

      // ======================================
      // INTERÉS COMERCIAL
      // ======================================

      if (
        !nombresColumnas.includes(
          "interesaTomaCuenta"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN interesaTomaCuenta
          INTEGER NOT NULL DEFAULT 0
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando interesaTomaCuenta:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna interesaTomaCuenta agregada."
            );
          }
        );
      }

      if (
        !nombresColumnas.includes(
          "interesaPromociones"
        )
      ) {
        db.run(
          `
          ALTER TABLE cotizaciones
          ADD COLUMN interesaPromociones
          INTEGER NOT NULL DEFAULT 0
          `,
          (migrationError) => {
            if (migrationError) {
              console.error(
                "❌ Error agregando interesaPromociones:",
                migrationError.message
              );

              return;
            }

            console.log(
              "✅ Columna interesaPromociones agregada."
            );
          }
        );
      }
    }
  );

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

  // ==========================================
  // REFERIDOS COMERCIALES
  // SEMINUEVOS / VENTAS
  // ==========================================

  db.run(`
    CREATE TABLE IF NOT EXISTS referidos_comerciales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      area TEXT NOT NULL,

      cotizacionId INTEGER NOT NULL,

      folioCotizacion TEXT NOT NULL DEFAULT '',

      clienteId INTEGER,

      nombreCliente TEXT NOT NULL DEFAULT '',

      telefonoCliente TEXT NOT NULL DEFAULT '',

      modeloVehiculo TEXT NOT NULL DEFAULT '',

      anioVehiculo TEXT NOT NULL DEFAULT '',

      versionVehiculo TEXT NOT NULL DEFAULT '',

      mensaje TEXT NOT NULL DEFAULT '',

      estadoSeguimiento TEXT NOT NULL DEFAULT 'Pendiente',

      FOREIGN KEY (cotizacionId)
        REFERENCES cotizaciones(id),

      FOREIGN KEY (clienteId)
        REFERENCES clientes(id),

      UNIQUE (
        cotizacionId,
        area
      )
    )
  `);

  // ==========================================
  // ÍNDICES DE REFERIDOS
  // ==========================================

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_referidos_area
    ON referidos_comerciales(area)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_referidos_fecha
    ON referidos_comerciales(fecha)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_referidos_cotizacion
    ON referidos_comerciales(cotizacionId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_referidos_cliente
    ON referidos_comerciales(nombreCliente)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_referidos_estado
    ON referidos_comerciales(estadoSeguimiento)
  `);
});

module.exports = db;