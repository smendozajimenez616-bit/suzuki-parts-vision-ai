const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database");
const { leerExcel } = require("../services/excelImporter");

const router = express.Router();

const importDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "inventarios"
);

if (!fs.existsSync(importDirectory)) {
  fs.mkdirSync(importDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, importDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);

    const fileName = `inventario-${Date.now()}${extension}`;

    callback(null, fileName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 30 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const validExtensions = [
      ".xlsx",
      ".xls",
      ".xlsm",
    ];

    if (!validExtensions.includes(extension)) {
      callback(
        new Error(
          "Selecciona un archivo de Excel válido."
        )
      );

      return;
    }

    callback(null, true);
  },
});

function ejecutarConsulta(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(
      sql,
      parameters,
      function handleQuery(error) {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          changes: this.changes,
          lastID: this.lastID,
        });
      }
    );
  });
}

function obtenerRefaccion(numeroParte) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT *
      FROM refacciones
      WHERE numeroParte = ?
      `,
      [numeroParte],
      (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row || null);
      }
    );
  });
}

async function importarRefaccion(refaccion) {
  const existente = await obtenerRefaccion(
    refaccion.numeroParte
  );

  if (existente) {
    await ejecutarConsulta(
      `
      UPDATE refacciones
      SET
        descripcion = ?,
        existencias = ?,
        ubicacion = ?,
        precio = ?
      WHERE numeroParte = ?
      `,
      [
        refaccion.descripcion,
        refaccion.existencias,
        refaccion.ubicacion,
        refaccion.precio,
        refaccion.numeroParte,
      ]
    );

    return "actualizada";
  }

  await ejecutarConsulta(
    `
    INSERT INTO refacciones
    (
      numeroParte,
      descripcion,
      modelo,
      anio,
      existencias,
      ubicacion,
      precio
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      refaccion.numeroParte,
      refaccion.descripcion,
      refaccion.modelo,
      refaccion.anio,
      refaccion.existencias,
      refaccion.ubicacion,
      refaccion.precio,
    ]
  );

  return "nueva";
}

// ==========================================
// LISTAR INVENTARIO CON BÚSQUEDA Y PAGINACIÓN
// ==========================================

router.get("/", (req, res) => {
  const busqueda = String(
    req.query.buscar || ""
  ).trim();

  const paginaSolicitada = Number(
    req.query.pagina || 1
  );

  const limiteSolicitado = Number(
    req.query.limite || 50
  );

  const pagina =
    Number.isInteger(paginaSolicitada) &&
    paginaSolicitada > 0
      ? paginaSolicitada
      : 1;

  const limite =
    Number.isInteger(limiteSolicitado) &&
    limiteSolicitado > 0
      ? Math.min(limiteSolicitado, 200)
      : 50;

  const offset = (pagina - 1) * limite;

  let whereSql = "";
  const parametrosBusqueda = [];

  if (busqueda) {
    whereSql = `
      WHERE
        numeroParte LIKE ?
        OR descripcion LIKE ?
        OR modelo LIKE ?
        OR anio LIKE ?
        OR ubicacion LIKE ?
    `;

    const patron = `%${busqueda}%`;

    parametrosBusqueda.push(
      patron,
      patron,
      patron,
      patron,
      patron
    );
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM refacciones
    ${whereSql}
  `;

  db.get(
    countSql,
    parametrosBusqueda,
    (countError, countRow) => {
      if (countError) {
        return res.status(500).json({
          success: false,
          mensaje: countError.message,
        });
      }

      const total = Number(
        countRow?.total || 0
      );

      const totalPaginas = Math.max(
        1,
        Math.ceil(total / limite)
      );

      const dataSql = `
        SELECT
          id,
          numeroParte,
          descripcion,
          modelo,
          anio,
          existencias,
          ubicacion,
          precio
        FROM refacciones
        ${whereSql}
        ORDER BY
          descripcion COLLATE NOCASE,
          numeroParte COLLATE NOCASE
        LIMIT ?
        OFFSET ?
      `;

      const parametrosDatos = [
        ...parametrosBusqueda,
        limite,
        offset,
      ];

      db.all(
        dataSql,
        parametrosDatos,
        (dataError, rows) => {
          if (dataError) {
            return res.status(500).json({
              success: false,
              mensaje: dataError.message,
            });
          }

          return res.json({
            success: true,

            datos: rows || [],

            paginacion: {
              pagina,
              limite,
              total,
              totalPaginas,
              tieneAnterior: pagina > 1,
              tieneSiguiente:
                pagina < totalPaginas,
            },

            filtros: {
              buscar: busqueda,
            },
          });
        }
      );
    }
  );
});

// ==========================================
// IMPORTAR EXCEL DE QUITER
// ==========================================

router.post(
  "/importar-excel",
  upload.single("archivo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje:
          "No se recibió ningún archivo de Excel.",
      });
    }

    let transactionStarted = false;

    try {
      const resultadoExcel = leerExcel(
        req.file.path
      );

      const resumen = {
        archivo: req.file.originalname,
        hoja: resultadoExcel.hoja,
        filasLeidas:
          resultadoExcel.filasLeidas,
        procesadas: 0,
        nuevas: 0,
        actualizadas: 0,
        errores: [
          ...resultadoExcel.errores,
        ],
      };

      await ejecutarConsulta(
        "BEGIN TRANSACTION"
      );

      transactionStarted = true;

      for (
        const refaccion of resultadoExcel.refacciones
      ) {
        try {
          const resultado =
            await importarRefaccion(refaccion);

          resumen.procesadas += 1;

          if (resultado === "nueva") {
            resumen.nuevas += 1;
          }

          if (resultado === "actualizada") {
            resumen.actualizadas += 1;
          }
        } catch (error) {
          resumen.errores.push({
            numeroParte:
              refaccion.numeroParte,
            mensaje: error.message,
          });
        }
      }

      await ejecutarConsulta("COMMIT");

      transactionStarted = false;

      return res.json({
        success: true,
        mensaje:
          "Inventario de Quiter importado correctamente.",
        resumen,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await ejecutarConsulta(
            "ROLLBACK"
          );
        } catch (rollbackError) {
          console.error(
            "Error al revertir la importación:",
            rollbackError
          );
        }
      }

      console.error(
        "Error al importar el Excel:",
        error
      );

      return res.status(500).json({
        success: false,
        mensaje:
          error.message ||
          "No se pudo importar el inventario.",
      });
    } finally {
      if (
        req.file?.path &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlink(
          req.file.path,
          (deleteError) => {
            if (deleteError) {
              console.error(
                "No se pudo eliminar el Excel temporal:",
                deleteError
              );
            }
          }
        );
      }
    }
  }
);

// ==========================================
// RESUMEN DEL INVENTARIO
// ==========================================

router.get("/resumen", (req, res) => {
  db.get(
    `
    SELECT
      COUNT(*) AS total,

      SUM(
        CASE
          WHEN existencias <= 0 THEN 1
          ELSE 0
        END
      ) AS sinExistencias,

      SUM(
        CASE
          WHEN existencias > 0
          AND existencias <= 2 THEN 1
          ELSE 0
        END
      ) AS existenciasBajas

    FROM refacciones
    `,
    [],
    (error, row) => {
      if (error) {
        return res.status(500).json({
          success: false,
          mensaje: error.message,
        });
      }

      return res.json({
        success: true,

        datos: {
          total: Number(row?.total || 0),

          sinExistencias: Number(
            row?.sinExistencias || 0
          ),

          existenciasBajas: Number(
            row?.existenciasBajas || 0
          ),
        },
      });
    }
  );
});

module.exports = router;