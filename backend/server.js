const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const inventarioRouter = require("./routes/inventario");

const {
  buscarCoincidencias,
} = require("./services/inventoryMatcher");

dotenv.config();

const db = require("./database");

const app = express();

const PORT =
  Number(process.env.PORT) || 3001;

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://frabjous-jelly-01adb7.netlify.app",
      ];

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (/^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origen no permitido por CORS: ${origin}`)
      );
    },
  })
);

app.use(express.json());

app.use(
  "/api/inventario",
  inventarioRouter
);

// ==========================================
// FUNCIONES GENERALES DE SQLITE
// ==========================================

function dbRun(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.run(
        sql,
        params,
        function handleRun(error) {
          if (error) {
            reject(error);
            return;
          }

          resolve({
            lastID: this.lastID,
            changes: this.changes,
          });
        }
      );
    }
  );
}

function dbGet(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.get(
        sql,
        params,
        (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(row || null);
        }
      );
    }
  );
}

function dbAll(sql, params = []) {
  return new Promise(
    (resolve, reject) => {
      db.all(
        sql,
        params,
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows || []);
        }
      );
    }
  );
}

// ==========================================
// CLIENTE DE GEMINI
// ==========================================

let geminiClientPromise = null;

async function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "No se encontró GEMINI_API_KEY."
    );
  }

  if (!geminiClientPromise) {
    geminiClientPromise = import(
      "@google/genai"
    ).then(
      ({ GoogleGenAI }) =>
        new GoogleGenAI({
          apiKey:
            process.env.GEMINI_API_KEY,
        })
    );
  }

  return geminiClientPromise;
}

// ==========================================
// CARPETA DE IMÁGENES
// ==========================================

const uploadsDirectory =
  path.join(
    __dirname,
    "uploads"
  );

if (
  !fs.existsSync(uploadsDirectory)
) {
  fs.mkdirSync(
    uploadsDirectory,
    {
      recursive: true,
    }
  );
}

// ==========================================
// MULTER PARA FOTOGRAFÍAS
// ==========================================

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        uploadsDirectory
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path.extname(
          file.originalname
        );

      const generatedName =
        `${Date.now()}-${Math.round(
          Math.random() *
            1_000_000
        )}${extension}`;

      callback(
        null,
        generatedName
      );
    },
  });

const upload = multer({
  storage,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {
    if (
      !file.mimetype.startsWith(
        "image/"
      )
    ) {
      callback(
        new Error(
          "El archivo seleccionado no es una imagen válida."
        )
      );

      return;
    }

    callback(null, true);
  },
});

// ==========================================
// FUNCIONES DE GEMINI
// ==========================================

function limpiarRespuestaJson(
  texto
) {
  return String(texto || "")
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function validarAnalisis(
  datos
) {
  return {
    nombrePieza:
      datos.nombrePieza ||
      "Pieza automotriz no determinada",

    descripcion:
      datos.descripcion ||
      "No fue posible generar una descripción.",

    categoria:
      datos.categoria ||
      "Sin determinar",

    posicion:
      datos.posicion ||
      "Sin determinar",

    modeloProbable:
      datos.modeloProbable ||
      "Sin determinar",

    anioProbable:
      datos.anioProbable ||
      "Sin determinar",

    numeroParteVisible:
      datos.numeroParteVisible ||
      null,

    confianza:
      Math.max(
        0,
        Math.min(
          100,
          Number(
            datos.confianza
          ) || 0
        )
      ),

    textoVisible:
      Array.isArray(
        datos.textoVisible
      )
        ? datos.textoVisible
        : [],

    advertencias:
      Array.isArray(
        datos.advertencias
      )
        ? datos.advertencias
        : [],
  };
}

async function analizarImagenConGemini(
  file
) {
  const ai =
    await getGeminiClient();

  const base64Image =
    fs.readFileSync(
      file.path,
      {
        encoding: "base64",
      }
    );

  const prompt = `
Analiza esta fotografía para un sistema de identificación
de refacciones automotrices Suzuki.

Describe únicamente lo que sea razonable inferir visualmente.

Reglas:

1. No uses el nombre del archivo para identificar la pieza.
2. No inventes números de parte.
3. Solo incluye numeroParteVisible si aparece claramente
   impreso, grabado o etiquetado en la fotografía.
4. Si aparece un automóvil completo o una sección del vehículo,
   indica cuál es la pieza principal visible.
5. El modelo y el año del vehículo son aproximaciones visuales,
   no confirmaciones.
6. La confianza debe ser un entero entre 0 y 100.
7. Responde únicamente con JSON válido, sin markdown.
8. Usa exactamente esta estructura:

{
  "nombrePieza": "nombre probable de la pieza",
  "descripcion": "descripción visual clara",
  "categoria": "carrocería, motor, frenos, suspensión, eléctrico u otra",
  "posicion": "delantera, trasera, izquierda, derecha o sin determinar",
  "modeloProbable": "modelo Suzuki probable o sin determinar",
  "anioProbable": "año o rango probable o sin determinar",
  "numeroParteVisible": null,
  "confianza": 0,
  "textoVisible": [],
  "advertencias": []
}
  `.trim();

  const interaction =
    await ai.interactions.create(
      {
        model:
          process.env
            .GEMINI_MODEL ||
          "gemini-3-flash-preview",

        input: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image",
            data: base64Image,
            mime_type:
              file.mimetype,
          },
        ],
      }
    );

  const outputText =
    interaction.output_text;

  if (!outputText) {
    throw new Error(
      "Gemini no devolvió ningún resultado."
    );
  }

  try {
    const jsonText =
      limpiarRespuestaJson(
        outputText
      );

    const datos =
      JSON.parse(
        jsonText
      );

    return validarAnalisis(
      datos
    );
  } catch (error) {
    console.error(
      "Respuesta original de Gemini:",
      outputText
    );

    throw new Error(
      "Gemini respondió, pero no devolvió el formato esperado."
    );
  }
}

// ==========================================
// FUNCIONES DE CLIENTES
// ==========================================

function limpiarTelefono(
  valor
) {
  return String(
    valor || ""
  )
    .replace(
      /[^\d+]/g,
      ""
    )
    .trim();
}

async function obtenerOCrearCliente(
  nombre,
  telefono
) {
  const nombreLimpio =
    String(
      nombre || ""
    ).trim();

  const telefonoLimpio =
    limpiarTelefono(
      telefono
    );

  if (
    !nombreLimpio ||
    !telefonoLimpio
  ) {
    throw new Error(
      "El nombre y el teléfono del cliente son obligatorios."
    );
  }

  const existente =
    await dbGet(
      `
      SELECT *
      FROM clientes
      WHERE telefono = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        telefonoLimpio,
      ]
    );

  if (existente) {
    if (
      existente.nombre !==
      nombreLimpio
    ) {
      await dbRun(
        `
        UPDATE clientes
        SET nombre = ?
        WHERE id = ?
        `,
        [
          nombreLimpio,
          existente.id,
        ]
      );

      return {
        ...existente,
        nombre:
          nombreLimpio,
      };
    }

    return existente;
  }

  const resultado =
    await dbRun(
      `
      INSERT INTO clientes
      (
        nombre,
        telefono
      )
      VALUES (?, ?)
      `,
      [
        nombreLimpio,
        telefonoLimpio,
      ]
    );

  return {
    id:
      resultado.lastID,

    nombre:
      nombreLimpio,

    telefono:
      telefonoLimpio,
  };
}

// ==========================================
// GENERAR FOLIO
// ==========================================

async function generarFolioCotizacion() {
  const ultima = await dbGet(`
    SELECT
      MAX(CAST(folio AS INTEGER)) AS ultimo
    FROM cotizaciones
    WHERE folio GLOB '[0-9]*'
  `);

  return String(
    Number(ultima?.ultimo || 0) + 1
  );
}

// ==========================================
// RUTAS GENERALES
// ==========================================

app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,

      mensaje:
        "Servidor Suzuki Parts Vision AI funcionando",
    });
  }
);

app.get(
  "/api/test",
  (req, res) => {
    res.json({
      success: true,

      mensaje:
        "Conexión Frontend ↔ Backend correcta",

      geminiConfigurado:
        Boolean(
          process.env
            .GEMINI_API_KEY
        ),
    });
  }
);

// ==========================================
// REFACCIONES
// ==========================================

app.get(
  "/api/refacciones",
  (req, res) => {
    db.all(
      `
      SELECT *
      FROM refacciones
      ORDER BY descripcion
      `,
      [],
      (
        error,
        rows
      ) => {
        if (error) {
          return res
            .status(500)
            .json({
              success:
                false,

              mensaje:
                error.message,
            });
        }

        return res.json({
          success: true,
          datos:
            rows || [],
        });
      }
    );
  }
);

app.post(
  "/api/refacciones",
  (req, res) => {
    const {
      numeroParte,
      descripcion,
      modelo,
      anio,
      existencias,
      ubicacion,
      precio,
    } = req.body;

    if (
      !numeroParte?.trim() ||
      !descripcion?.trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,

          mensaje:
            "El número de parte y la descripción son obligatorios.",
        });
    }

    db.run(
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
        numeroParte.trim(),
        descripcion.trim(),
        modelo?.trim() ||
          "",
        anio?.trim() ||
          "",
        Number(
          existencias || 0
        ),
        ubicacion?.trim() ||
          "",
        Number(
          precio || 0
        ),
      ],
      function handleInsert(
        error
      ) {
        if (error) {
          const mensaje =
            error.message.includes(
              "UNIQUE constraint failed"
            )
              ? "Ese número de parte ya existe en el inventario."
              : error.message;

          return res
            .status(500)
            .json({
              success:
                false,
              mensaje,
            });
        }

        return res
          .status(201)
          .json({
            success: true,

            id:
              this.lastID,

            mensaje:
              "Refacción agregada correctamente.",
          });
      }
    );
  }
);

// ==========================================
// CLIENTES
// ==========================================

app.get(
  "/api/clientes",
  async (req, res) => {
    try {
      const buscar =
        String(
          req.query.buscar ||
            ""
        ).trim();

      let sql = `
        SELECT
          id,
          nombre,
          telefono,
          fechaRegistro
        FROM clientes
      `;

      const params = [];

      if (buscar) {
        sql += `
          WHERE
            nombre LIKE ?
            OR telefono LIKE ?
        `;

        const patron =
          `%${buscar}%`;

        params.push(
          patron,
          patron
        );
      }

      sql += `
        ORDER BY
          fechaRegistro DESC,
          id DESC
        LIMIT 100
      `;

      const clientes =
        await dbAll(
          sql,
          params
        );

      return res.json({
        success: true,
        datos: clientes,
      });
    } catch (error) {
      console.error(
        "Error al consultar clientes:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudieron consultar los clientes.",
        });
    }
  }
);

app.post(
  "/api/clientes",
  async (req, res) => {
    try {
      const nombre =
        String(
          req.body?.nombre ||
            ""
        ).trim();

      const telefono =
        limpiarTelefono(
          req.body
            ?.telefono
        );

      if (
        !nombre ||
        !telefono
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "El nombre y el teléfono son obligatorios.",
          });
      }

      const cliente =
        await obtenerOCrearCliente(
          nombre,
          telefono
        );

      return res
        .status(201)
        .json({
          success: true,

          mensaje:
            "Cliente guardado correctamente.",

          cliente,
        });
    } catch (error) {
      console.error(
        "Error al guardar cliente:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo guardar el cliente.",
        });
    }
  }
);

// ==========================================
// COTIZACIONES
// ==========================================

app.post(
  "/api/cotizaciones",
  async (req, res) => {
    let transactionStarted =
      false;

    try {
      const nombreCliente =
        String(
          req.body
            ?.nombreCliente ||
            ""
        ).trim();

      const telefonoCliente =
        limpiarTelefono(
          req.body
            ?.telefonoCliente
        );
const modeloVehiculo =
  String(
    req.body?.modeloVehiculo ||
      ""
  ).trim();

const anioVehiculo =
  String(
    req.body?.anioVehiculo ||
      ""
  ).trim();

const versionVehiculo =
  String(
    req.body?.versionVehiculo ||
      ""
  ).trim();
  const interesaTomaCuenta =
  req.body?.interesaTomaCuenta === true ||
  req.body?.interesaTomaCuenta === 1 ||
  req.body?.interesaTomaCuenta === "1" ||
  req.body?.interesaTomaCuenta === "Si" ||
  req.body?.interesaTomaCuenta === "Sí";

const interesaPromociones =
  req.body?.interesaPromociones === true ||
  req.body?.interesaPromociones === 1 ||
  req.body?.interesaPromociones === "1" ||
  req.body?.interesaPromociones === "Si" ||
  req.body?.interesaPromociones === "Sí";
      const items =
        Array.isArray(
          req.body?.items
        )
          ? req.body.items
          : [];

      const observaciones =
        String(
          req.body
            ?.observaciones ||
            ""
        ).trim();

      if (
        !nombreCliente ||
        !telefonoCliente
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "El nombre y el teléfono del cliente son obligatorios.",
          });
      }

      if (
        items.length === 0
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "La cotización debe incluir al menos una refacción.",
          });
      }

      const itemsNormalizados =
        items.map(
          (item) => {
            const numeroParte =
              String(
                item
                  ?.numeroParte ||
                  ""
              ).trim();

            const descripcion =
              String(
                item
                  ?.descripcion ||
                  ""
              ).trim();

            const cantidad =
              Math.max(
                1,
                Number(
                  item
                    ?.cantidad ||
                    1
                )
              );

            const precioUnitario =
              Math.max(
                0,
                Number(
                  item
                    ?.precioUnitario ??
                    item?.precio ??
                    0
                )
              );

            return {
              numeroParte,
              descripcion,
              cantidad,
              precioUnitario,

              subtotal:
                cantidad *
                precioUnitario,
            };
          }
        );

      const itemInvalido =
        itemsNormalizados.find(
          (item) =>
            !item.numeroParte
        );

      if (itemInvalido) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "Todas las refacciones deben tener número de parte.",
          });
      }

      const subtotal =
        itemsNormalizados.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            item.subtotal,
          0
        );

      const total =
        subtotal;

      const folio =
  await generarFolioCotizacion();

      await dbRun(
        "BEGIN TRANSACTION"
      );

      transactionStarted =
        true;

      const cliente =
        await obtenerOCrearCliente(
          nombreCliente,
          telefonoCliente
        );

      const resultadoCotizacion =
  await dbRun(
    `
      INSERT INTO cotizaciones
      (
        folio,
        clienteId,
        estado,
        subtotal,
        total,
        observaciones,
        modeloVehiculo,
        anioVehiculo,
        versionVehiculo,
        interesaTomaCuenta,
        interesaPromociones
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      folio,
      cliente.id,
      "Pendiente",
      subtotal,
      total,
      observaciones,
      modeloVehiculo,
      anioVehiculo,
      versionVehiculo,
      interesaTomaCuenta ? 1 : 0,
      interesaPromociones ? 1 : 0,
    ]
  );

      const cotizacionId =
        resultadoCotizacion.lastID;

      for (
        const item of
        itemsNormalizados
      ) {
        await dbRun(
          `
          INSERT INTO cotizacion_detalle
          (
            cotizacionId,
            numeroParte,
            descripcion,
            cantidad,
            precioUnitario,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            cotizacionId,
            item.numeroParte,
            item.descripcion,
            item.cantidad,
            item.precioUnitario,
            item.subtotal,
          ]
        );

        // ==================================
        // HISTORIAL PERMANENTE
        // ==================================

        await dbRun(
          `
          INSERT INTO historial_pedidos
          (
            clienteId,
            nombreCliente,
            telefonoCliente,
            cotizacionId,
            folioCotizacion,
            numeroParte,
            descripcion,
            cantidad,
            precioUnitario,
            subtotal,
            estado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            cliente.id,
            cliente.nombre,
            cliente.telefono,
            cotizacionId,
            folio,
            item.numeroParte,
            item.descripcion,
            item.cantidad,
            item.precioUnitario,
            item.subtotal,
            "Pendiente",
          ]
        );
      }

      // ==========================================
      // REFERIDO A SEMINUEVOS
      // ==========================================

      if (interesaTomaCuenta) {
        const mensajeSeminuevos =
          "Cliente interesado en conocer cuánto se le puede ofrecer por su vehículo como toma a cuenta.";

        await dbRun(
          `
            INSERT OR IGNORE INTO referidos_comerciales
            (
              area,
              cotizacionId,
              folioCotizacion,
              clienteId,
              nombreCliente,
              telefonoCliente,
              modeloVehiculo,
              anioVehiculo,
              versionVehiculo,
              mensaje,
              estadoSeguimiento
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            "Seminuevos",
            cotizacionId,
            folio,
            cliente.id,
            cliente.nombre,
            cliente.telefono,
            modeloVehiculo,
            anioVehiculo,
            versionVehiculo,
            mensajeSeminuevos,
            "Pendiente",
          ]
        );
      }

      // ==========================================
      // REFERIDO A VENTAS
      // ==========================================

      if (interesaPromociones) {
        const mensajeVentas =
          "Cliente interesado en recibir información y promociones comerciales de autos nuevos.";

        await dbRun(
          `
            INSERT OR IGNORE INTO referidos_comerciales
            (
              area,
              cotizacionId,
              folioCotizacion,
              clienteId,
              nombreCliente,
              telefonoCliente,
              modeloVehiculo,
              anioVehiculo,
              versionVehiculo,
              mensaje,
              estadoSeguimiento
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            "Ventas",
            cotizacionId,
            folio,
            cliente.id,
            cliente.nombre,
            cliente.telefono,
            modeloVehiculo,
            anioVehiculo,
            versionVehiculo,
            mensajeVentas,
            "Pendiente",
          ]
        );
      }

      await dbRun(
        "COMMIT"
      );

      transactionStarted =
        false;

      return res
        .status(201)
        .json({
          success: true,

          mensaje:
            "Cotización creada correctamente.",

         cotizacion: {
  id:
    cotizacionId,

  folio,

  cliente,

  estado:
    "Pendiente",

  subtotal,

  total,

  observaciones,

  modeloVehiculo,
  anioVehiculo,
  versionVehiculo,

  interesaTomaCuenta,
  interesaPromociones,

  items:
    itemsNormalizados,
          },
        });
    } catch (error) {
      if (
        transactionStarted
      ) {
        try {
          await dbRun(
            "ROLLBACK"
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "Error al revertir la cotización:",
            rollbackError
          );
        }
      }

      console.error(
        "Error al crear cotización:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo crear la cotización.",
        });
    }
  }
);

// ==========================================
// LISTAR COTIZACIONES
// ==========================================

app.get(
  "/api/cotizaciones",
  async (req, res) => {
    try {
      const rows =
        await dbAll(`
          SELECT
  c.id,
  c.folio,
  c.fecha,
  c.estado,
  c.subtotal,
  c.total,
 c.observaciones,
c.motivoRechazo,
c.detalleMotivoRechazo,
c.modeloVehiculo,
c.anioVehiculo,
c.versionVehiculo,
c.interesaTomaCuenta,
c.interesaPromociones,

            cl.id
              AS clienteId,

            cl.nombre
              AS nombreCliente,

            cl.telefono
              AS telefonoCliente

          FROM cotizaciones c

          INNER JOIN clientes cl
            ON cl.id =
            c.clienteId

          ORDER BY
            c.fecha DESC,
            c.id DESC
        `);

      return res.json({
        success: true,
        datos: rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar cotizaciones:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudieron consultar las cotizaciones.",
        });
    }
  }
);

// ==========================================
// CONSULTAR UNA COTIZACIÓN
// ==========================================

app.get(
  "/api/cotizaciones/:id",
  async (req, res) => {
    try {
      const id =
        Number(
          req.params.id
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "Identificador de cotización inválido.",
          });
      }

      const cotizacion =
        await dbGet(
          `
         SELECT
  c.id,
  c.folio,
  c.fecha,
  c.estado,
  c.subtotal,
  c.total,
 c.observaciones,
c.motivoRechazo,
c.detalleMotivoRechazo,
c.modeloVehiculo,
c.anioVehiculo,
c.versionVehiculo,
c.interesaTomaCuenta,
c.interesaPromociones,

            cl.id
              AS clienteId,

            cl.nombre
              AS nombreCliente,

            cl.telefono
              AS telefonoCliente

          FROM cotizaciones c

          INNER JOIN clientes cl
            ON cl.id =
            c.clienteId

          WHERE c.id = ?
          `,
          [id]
        );

      if (!cotizacion) {
        return res
          .status(404)
          .json({
            success:
              false,

            mensaje:
              "No se encontró la cotización.",
          });
      }

      const items =
        await dbAll(
          `
          SELECT
            id,
            numeroParte,
            descripcion,
            cantidad,
            precioUnitario,
            subtotal

          FROM cotizacion_detalle

          WHERE cotizacionId = ?

          ORDER BY id
          `,
          [id]
        );

      return res.json({
        success: true,

        cotizacion: {
          ...cotizacion,
          items,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar cotización:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo consultar la cotización.",
        });
    }
  }
);

// ==========================================
// CAMBIAR ESTADO DE COTIZACIÓN
// ==========================================

app.patch(
  "/api/cotizaciones/:id/estado",
  async (req, res) => {
    let transactionStarted =
      false;

    try {
      const id =
        Number(
          req.params.id
        );

      const estado =
        String(
          req.body?.estado ||
            ""
        ).trim();
        const motivoRechazo =
  String(
    req.body?.motivoRechazo ||
      ""
  ).trim();

const detalleMotivoRechazo =
  String(
    req.body?.detalleMotivoRechazo ||
      ""
  ).trim();

      const estadosPermitidos =
        [
          "Pendiente",
          "Enviada",
          "Aceptada",
          "Rechazada",
          "Vencida",
        ];

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "Identificador de cotización inválido.",
          });
      }

      if (
        !estadosPermitidos.includes(
          estado
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            mensaje:
              "Estado de cotización inválido.",
          });
      }

      await dbRun(
        "BEGIN TRANSACTION"
      );

      transactionStarted =
        true;

    const resultado =
  await dbRun(
    `
      UPDATE cotizaciones
      SET
        estado = ?,
        motivoRechazo = ?,
        detalleMotivoRechazo = ?
      WHERE id = ?
    `,
    [
      estado,
      estado === "Rechazada"
        ? motivoRechazo
        : "",
      estado === "Rechazada"
        ? detalleMotivoRechazo
        : "",
      id,
    ]
  );

      if (
        resultado.changes ===
        0
      ) {
        await dbRun(
          "ROLLBACK"
        );

        transactionStarted =
          false;

        return res
          .status(404)
          .json({
            success:
              false,

            mensaje:
              "No se encontró la cotización.",
          });
      }

      // El historial NO se elimina.
      // Solo cambia el estado.

      await dbRun(
        `
        UPDATE historial_pedidos
        SET estado = ?
        WHERE cotizacionId = ?
        `,
        [
          estado,
          id,
        ]
      );

      await dbRun(
        "COMMIT"
      );

      transactionStarted =
        false;

      return res.json({
  success: true,

  mensaje:
    "Estado actualizado correctamente.",

  estado,

  motivoRechazo:
    estado === "Rechazada"
      ? motivoRechazo
      : "",

  detalleMotivoRechazo:
    estado === "Rechazada"
      ? detalleMotivoRechazo
      : "",
});
    } catch (error) {
      if (
        transactionStarted
      ) {
        try {
          await dbRun(
            "ROLLBACK"
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "Error al revertir actualización:",
            rollbackError
          );
        }
      }

      console.error(
        "Error al actualizar estado:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo actualizar el estado.",
        });
    }
  }
);

// ==========================================
// HISTORIAL PERMANENTE
// ==========================================

app.get(
  "/api/historial",
  async (req, res) => {
    try {
      const buscar =
        String(
          req.query.buscar || ""
        ).trim();

      const paginaSolicitada =
        Number(
          req.query.pagina || 1
        );

      const limiteSolicitado =
        Number(
          req.query.limite || 50
        );

      const pagina =
        Number.isInteger(
          paginaSolicitada
        ) &&
        paginaSolicitada > 0
          ? paginaSolicitada
          : 1;

      const limite =
        Number.isInteger(
          limiteSolicitado
        ) &&
        limiteSolicitado > 0
          ? Math.min(
              limiteSolicitado,
              200
            )
          : 50;

      const offset =
        (pagina - 1) * limite;

      let whereSql = "";

      const params = [];

      if (buscar) {
        whereSql = `
          WHERE
            h.nombreCliente LIKE ?
            OR h.telefonoCliente LIKE ?
            OR h.numeroParte LIKE ?
            OR h.descripcion LIKE ?
            OR h.folioCotizacion LIKE ?
            OR h.estado LIKE ?
            OR c.modeloVehiculo LIKE ?
            OR c.anioVehiculo LIKE ?
            OR c.versionVehiculo LIKE ?
        `;

        const patron =
          `%${buscar}%`;

        params.push(
          patron,
          patron,
          patron,
          patron,
          patron,
          patron,
          patron,
          patron,
          patron
        );
      }

      // ======================================
      // CONTAR REGISTROS
      // ======================================

      const totalRow =
        await dbGet(
          `
            SELECT
              COUNT(*) AS total

            FROM historial_pedidos h

            LEFT JOIN cotizaciones c
              ON c.id = h.cotizacionId

            ${whereSql}
          `,
          params
        );

      const total =
        Number(
          totalRow?.total || 0
        );

      // ======================================
      // OBTENER HISTORIAL
      // ======================================

      const datos =
        await dbAll(
          `
            SELECT
              h.id,
              h.fecha,
              h.clienteId,
              h.nombreCliente,
              h.telefonoCliente,
              h.cotizacionId,
              h.folioCotizacion,
              h.numeroParte,
              h.descripcion,
              h.cantidad,
              h.precioUnitario,
              h.subtotal,
              h.estado,

              COALESCE(
                c.modeloVehiculo,
                ''
              ) AS modeloVehiculo,

              COALESCE(
                c.anioVehiculo,
                ''
              ) AS anioVehiculo,

              COALESCE(
                c.versionVehiculo,
                ''
              ) AS versionVehiculo

            FROM historial_pedidos h

            LEFT JOIN cotizaciones c
              ON c.id = h.cotizacionId

            ${whereSql}

            ORDER BY
              h.fecha DESC,
              h.id DESC

            LIMIT ?
            OFFSET ?
          `,
          [
            ...params,
            limite,
            offset,
          ]
        );

      const totalPaginas =
        Math.max(
          1,
          Math.ceil(
            total / limite
          )
        );

      return res.json({
        success: true,

        datos,

        paginacion: {
          pagina,
          limite,
          total,
          totalPaginas,

          tieneAnterior:
            pagina > 1,

          tieneSiguiente:
            pagina <
            totalPaginas,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar historial:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo consultar el historial.",
        });
    }
  }
);

// ==========================================
// REFERIDOS COMERCIALES
// ==========================================

app.get(
  "/api/referidos",
  async (req, res) => {
    try {
      const area =
        String(
          req.query.area || ""
        ).trim();

      const buscar =
        String(
          req.query.buscar || ""
        ).trim();

      const condiciones = [];
      const params = [];

      if (
        area === "Seminuevos" ||
        area === "Ventas"
      ) {
        condiciones.push("area = ?");
        params.push(area);
      }

      if (buscar) {
        condiciones.push(`
          (
            nombreCliente LIKE ?
            OR telefonoCliente LIKE ?
            OR folioCotizacion LIKE ?
            OR modeloVehiculo LIKE ?
            OR anioVehiculo LIKE ?
            OR versionVehiculo LIKE ?
          )
        `);

        const patron = `%${buscar}%`;

        params.push(
          patron,
          patron,
          patron,
          patron,
          patron,
          patron
        );
      }

      const whereSql =
        condiciones.length > 0
          ? `WHERE ${condiciones.join(" AND ")}`
          : "";

      const datos =
        await dbAll(
          `
            SELECT
              id,
              fecha,
              area,
              cotizacionId,
              folioCotizacion,
              clienteId,
              nombreCliente,
              telefonoCliente,
              modeloVehiculo,
              anioVehiculo,
              versionVehiculo,
              mensaje,
              estadoSeguimiento

            FROM referidos_comerciales

            ${whereSql}

            ORDER BY
              fecha DESC,
              id DESC
          `,
          params
        );

      return res.json({
        success: true,
        datos,
      });
    } catch (error) {
      console.error(
        "Error al consultar referidos:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          mensaje:
            error.message ||
            "No se pudieron consultar los referidos.",
        });
    }
  }
);
// ==========================================
// ACTUALIZAR SEGUIMIENTO DE REFERIDO
// ==========================================

app.patch(
  "/api/referidos/:id/estado",
  async (req, res) => {
    try {
      const id =
        Number(
          req.params.id
        );

      const estadoSeguimiento =
        String(
          req.body?.estadoSeguimiento ||
            ""
        ).trim();

      const estadosPermitidos = [
        "Pendiente",
        "Contactado",
        "Atendido",
        "Cerrado",
      ];

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            mensaje:
              "Identificador de referido inválido.",
          });
      }

      if (
        !estadosPermitidos.includes(
          estadoSeguimiento
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            mensaje:
              "Estado de seguimiento inválido.",
          });
      }

      const resultado =
        await dbRun(
          `
            UPDATE referidos_comerciales

            SET estadoSeguimiento = ?

            WHERE id = ?
          `,
          [
            estadoSeguimiento,
            id,
          ]
        );

      if (
        resultado.changes === 0
      ) {
        return res
          .status(404)
          .json({
            success: false,

            mensaje:
              "No se encontró el referido.",
          });
      }

      return res.json({
        success: true,

        mensaje:
          "Seguimiento actualizado correctamente.",

        estadoSeguimiento,
      });
    } catch (error) {
      console.error(
        "Error al actualizar seguimiento:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo actualizar el seguimiento.",
        });
    }
  }
);

// ==========================================
// CONVERSIÓN DE COMPRA
// ==========================================

app.get(
  "/api/conversion",
  async (req, res) => {
    try {
      const resumen =
        await dbGet(`
          SELECT
            COUNT(*)
              AS totalCotizaciones,

            SUM(
              CASE
                WHEN estado =
                'Aceptada'
                THEN 1
                ELSE 0
              END
            ) AS aceptadas,

            SUM(
              CASE
                WHEN estado =
                'Rechazada'
                THEN 1
                ELSE 0
              END
            ) AS rechazadas,

            SUM(
              CASE
                WHEN estado =
                'Pendiente'
                OR estado =
                'Enviada'
                THEN 1
                ELSE 0
              END
            ) AS pendientes,

            SUM(
              CASE
                WHEN estado =
                'Aceptada'
                THEN total
                ELSE 0
              END
            ) AS montoConvertido

          FROM cotizaciones
        `);

      const totalCotizaciones =
        Number(
          resumen
            ?.totalCotizaciones ||
            0
        );

      const aceptadas =
        Number(
          resumen?.aceptadas ||
            0
        );

      const porcentajeConversion =
        totalCotizaciones > 0
          ? Number(
              (
                (
                  aceptadas /
                  totalCotizaciones
                ) *
                100
              ).toFixed(2)
            )
          : 0;

      return res.json({
        success: true,

        datos: {
          totalCotizaciones,

          aceptadas,

          rechazadas:
            Number(
              resumen
                ?.rechazadas ||
                0
            ),

          pendientes:
            Number(
              resumen
                ?.pendientes ||
                0
            ),

          porcentajeConversion,

          montoConvertido:
            Number(
              resumen
                ?.montoConvertido ||
                0
            ),
        },
      });
    } catch (error) {
      console.error(
        "Error al calcular conversión:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          mensaje:
            error.message ||
            "No se pudo calcular la conversión.",
        });
    }
  }
);

// ==========================================
// IDENTIFICAR PIEZA CON GEMINI
// ==========================================

async function identificarPieza(
  req,
  res
) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,

          mensaje:
            "No se recibió ninguna imagen.",
        });
    }

    console.log(
      "Analizando fotografía:",
      {
        nombre:
          req.file
            .originalname,

        tipo:
          req.file
            .mimetype,

        tamaño:
          req.file
            .size,
      }
    );

    const analisisGemini =
      await analizarImagenConGemini(
        req.file
      );

    const coincidenciasInventario =
      await buscarCoincidencias(
        analisisGemini,
        5
      );

    const inventario =
      coincidenciasInventario[0] ||
      null;

    const analisisCompatible =
      {
        descripcion:
          analisisGemini
            .nombrePieza,

        detalle:
          analisisGemini
            .descripcion,

        numeroParte:
          analisisGemini
            .numeroParteVisible,

        modelo:
          analisisGemini
            .modeloProbable,

        anio:
          analisisGemini
            .anioProbable,

        categoria:
          analisisGemini
            .categoria,

        posicion:
          analisisGemini
            .posicion,

        confianza:
          analisisGemini
            .confianza,

        textoVisible:
          analisisGemini
            .textoVisible,

        advertencias:
          analisisGemini
            .advertencias,
      };

    console.log(
      "Resultado de Gemini:",
      analisisCompatible
    );

    console.log(
      "Coincidencia principal:",
      inventario
        ? inventario
            .numeroParte
        : "Sin coincidencia"
    );

    console.log(
      "Coincidencias encontradas:",
      coincidenciasInventario
        .length
    );

    return res.json({
      success: true,

      mensaje:
        "La fotografía fue analizada con Gemini.",

      simulacion: false,

      archivo: {
        nombre:
          req.file
            .originalname,

        nombreGuardado:
          req.file
            .filename,

        tipo:
          req.file
            .mimetype,

        tamaño:
          req.file
            .size,
      },

      analisis:
        analisisCompatible,

      inventarioEncontrado:
        Boolean(
          inventario
        ),

      inventario,

      coincidenciasInventario,
    });
  } catch (error) {
    console.error(
      "Error durante el análisis:",
      error
    );

    let statusCode = 500;

    let mensaje =
      error.message ||
      "No se pudo analizar la fotografía.";

    const errorText =
      String(
        error.message ||
          ""
      ).toLowerCase();

    if (
      errorText.includes(
        "api key"
      ) ||
      errorText.includes(
        "unauthorized"
      ) ||
      errorText.includes(
        "permission"
      )
    ) {
      statusCode = 401;

      mensaje =
        "La clave de Gemini no es válida o no tiene permisos.";
    }

    if (
      errorText.includes(
        "quota"
      ) ||
      errorText.includes(
        "rate limit"
      ) ||
      errorText.includes(
        "resource exhausted"
      )
    ) {
      statusCode = 429;

      mensaje =
        "Se alcanzó el límite disponible de Gemini. Intenta nuevamente más tarde.";
    }

    return res
      .status(statusCode)
      .json({
        success: false,
        mensaje,
      });
  } finally {
    // La imagen solo es temporal.
    // Después del análisis se elimina.

    if (
      req.file?.path &&
      fs.existsSync(
        req.file.path
      )
    ) {
      fs.unlink(
        req.file.path,
        (deleteError) => {
          if (
            deleteError
          ) {
            console.error(
              "No se pudo eliminar la imagen temporal:",
              deleteError
            );
          }
        }
      );
    }
  }
}

// ==========================================
// RUTAS DE IDENTIFICACIÓN
// ==========================================

app.post(
  "/api/upload",
  upload.single("image"),
  identificarPieza
);

app.post(
  "/api/identificar",
  upload.single("image"),
  identificarPieza
);

// ==========================================
// CONTROL DE ERRORES
// ==========================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Error del servidor:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      return res
        .status(400)
        .json({
          success: false,

          mensaje:
            error.code ===
            "LIMIT_FILE_SIZE"
              ? "La imagen no debe pesar más de 10 MB."
              : "No se pudo recibir la imagen.",
        });
    }

    return res
      .status(400)
      .json({
        success: false,

        mensaje:
          error.message ||
          "Ocurrió un error inesperado en el servidor.",
      });
  }
);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(
  PORT,
  () => {
    console.log(
      `🚀 Servidor iniciado en puerto ${PORT}`
    );

    console.log(
      "✅ Inventario SQLite disponible."
    );

    console.log(
      process.env
        .GEMINI_API_KEY
        ? "🤖 Gemini configurado."
        : "⚠️ GEMINI_API_KEY no configurada."
    );

    console.log(
      `📷 Modelo: ${
        process.env
          .GEMINI_MODEL ||
        "gemini-3-flash-preview"
      }`
    );

    console.log(
      "👤 Módulo de clientes disponible."
    );

    console.log(
      "🧾 Módulo de cotizaciones disponible."
    );

    console.log(
      "📚 Historial permanente disponible."
    );
  }
);