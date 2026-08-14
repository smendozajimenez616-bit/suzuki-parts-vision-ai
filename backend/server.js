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
const PORT = Number(process.env.PORT) || 3001;

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://frabjous-jelly-01adb7.netlify.app",
    ],
  })
);

app.use(express.json());

app.use("/api/inventario", inventarioRouter);

// ==========================================
// CLIENTE DE GEMINI
// ==========================================

// Se usa importación dinámica porque tu backend trabaja con CommonJS.
let geminiClientPromise = null;

async function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "No se encontró GEMINI_API_KEY en el archivo backend/.env."
    );
  }

  if (!geminiClientPromise) {
    geminiClientPromise = import("@google/genai").then(
      ({ GoogleGenAI }) =>
        new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
        })
    );
  }

  return geminiClientPromise;
}

// ==========================================
// CARPETA DE IMÁGENES
// ==========================================

const uploadsDirectory = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, {
    recursive: true,
  });
}

// ==========================================
// CONFIGURACIÓN DE MULTER
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadsDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);

    const generatedName = `${Date.now()}-${Math.round(
      Math.random() * 1_000_000
    )}${extension}`;

    callback(null, generatedName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
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
// FUNCIONES DE SQLITE
// ==========================================

function obtenerTodasLasRefacciones() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT *
      FROM refacciones
      ORDER BY descripcion
      `,
      [],
      (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows || []);
      }
    );
  });
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerPalabras(valor) {
  return normalizarTexto(valor)
    .split(" ")
    .filter((palabra) => palabra.length >= 3);
}

function calcularPuntuacion(refaccion, analisis) {
  const textoRefaccion = normalizarTexto(
    [
      refaccion.numeroParte,
      refaccion.descripcion,
      refaccion.modelo,
      refaccion.anio,
      refaccion.ubicacion,
    ].join(" ")
  );

  const camposAnalisis = [
    analisis.nombrePieza,
    analisis.descripcion,
    analisis.modeloProbable,
    analisis.anioProbable,
    analisis.categoria,
    analisis.posicion,
  ];

  const palabras = camposAnalisis.flatMap(obtenerPalabras);

  let puntuacion = 0;

  palabras.forEach((palabra) => {
    if (textoRefaccion.includes(palabra)) {
      puntuacion += 1;
    }
  });

  if (
    analisis.numeroParteVisible &&
    normalizarTexto(refaccion.numeroParte) ===
      normalizarTexto(analisis.numeroParteVisible)
  ) {
    puntuacion += 10;
  }

  return puntuacion;
}

async function buscarMejorCoincidencia(analisis) {
  const refacciones = await obtenerTodasLasRefacciones();

  if (refacciones.length === 0) {
    return null;
  }

  const resultados = refacciones
    .map((refaccion) => ({
      refaccion,
      puntuacion: calcularPuntuacion(
        refaccion,
        analisis
      ),
    }))
    .sort(
      (primero, segundo) =>
        segundo.puntuacion - primero.puntuacion
    );

  const mejorResultado = resultados[0];

  // Evita mostrar coincidencias demasiado débiles.
  if (!mejorResultado || mejorResultado.puntuacion < 2) {
    return null;
  }

  return {
    ...mejorResultado.refaccion,
    puntuacionCoincidencia:
      mejorResultado.puntuacion,
  };
}

// ==========================================
// FUNCIONES DE GEMINI
// ==========================================

function limpiarRespuestaJson(texto) {
  return String(texto || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validarAnalisis(datos) {
  return {
    nombrePieza:
      datos.nombrePieza ||
      "Pieza automotriz no determinada",

    descripcion:
      datos.descripcion ||
      "No fue posible generar una descripción.",

    categoria:
      datos.categoria || "Sin determinar",

    posicion:
      datos.posicion || "Sin determinar",

    modeloProbable:
      datos.modeloProbable || "Sin determinar",

    anioProbable:
      datos.anioProbable || "Sin determinar",

    numeroParteVisible:
      datos.numeroParteVisible || null,

    confianza: Math.max(
      0,
      Math.min(100, Number(datos.confianza) || 0)
    ),

    textoVisible: Array.isArray(datos.textoVisible)
      ? datos.textoVisible
      : [],

    advertencias: Array.isArray(datos.advertencias)
      ? datos.advertencias
      : [],
  };
}

async function analizarImagenConGemini(file) {
  const ai = await getGeminiClient();

  const base64Image = fs.readFileSync(file.path, {
    encoding: "base64",
  });

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
    await ai.interactions.create({
      model:
        process.env.GEMINI_MODEL ||
        "gemini-3.5-flash",

      input: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image",
          data: base64Image,
          mime_type: file.mimetype,
        },
      ],
    });

  const outputText = interaction.output_text;

  if (!outputText) {
    throw new Error(
      "Gemini no devolvió ningún resultado."
    );
  }

  try {
    const jsonText =
      limpiarRespuestaJson(outputText);

    const datos = JSON.parse(jsonText);

    return validarAnalisis(datos);
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
// RUTAS GENERALES
// ==========================================

app.get("/", (req, res) => {
  res.json({
    mensaje:
      "Servidor Suzuki Parts Vision AI funcionando",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    mensaje:
      "Conexión Frontend ↔ Backend correcta",
    geminiConfigurado:
      Boolean(process.env.GEMINI_API_KEY),
  });
});

// ==========================================
// INVENTARIO
// ==========================================

app.get("/api/refacciones", (req, res) => {
  db.all(
    `
    SELECT *
    FROM refacciones
    ORDER BY descripcion
    `,
    [],
    (error, rows) => {
      if (error) {
        return res.status(500).json({
          success: false,
          mensaje: error.message,
        });
      }

      return res.json({
        success: true,
        datos: rows,
      });
    }
  );
});

app.post("/api/refacciones", (req, res) => {
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
    return res.status(400).json({
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
      modelo?.trim() || "",
      anio?.trim() || "",
      Number(existencias || 0),
      ubicacion?.trim() || "",
      Number(precio || 0),
    ],
    function handleInsert(error) {
      if (error) {
        const mensaje =
          error.message.includes(
            "UNIQUE constraint failed"
          )
            ? "Ese número de parte ya existe en el inventario."
            : error.message;

        return res.status(500).json({
          success: false,
          mensaje,
        });
      }

      return res.status(201).json({
        success: true,
        id: this.lastID,
        mensaje:
          "Refacción agregada correctamente.",
      });
    }
  );
});

// ==========================================
// ANÁLISIS REAL DE IMAGEN CON GEMINI
// ==========================================

async function identificarPieza(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje:
          "No se recibió ninguna imagen.",
      });
    }

    console.log("Analizando fotografía:", {
      nombre: req.file.originalname,
      tipo: req.file.mimetype,
      tamaño: req.file.size,
    });

    const analisisGemini =
      await analizarImagenConGemini(req.file);

    const coincidenciasInventario =
  await buscarCoincidencias(
    analisisGemini,
    5
  );

const inventario =
  coincidenciasInventario[0] || null;

    const analisisCompatible = {
      descripcion:
        analisisGemini.nombrePieza,

      detalle:
        analisisGemini.descripcion,

      numeroParte:
        analisisGemini.numeroParteVisible,

      modelo:
        analisisGemini.modeloProbable,

      anio:
        analisisGemini.anioProbable,

      categoria:
        analisisGemini.categoria,

      posicion:
        analisisGemini.posicion,

      confianza:
        analisisGemini.confianza,

      textoVisible:
        analisisGemini.textoVisible,

      advertencias:
        analisisGemini.advertencias,
    };

    console.log(
      "Resultado de Gemini:",
      analisisCompatible
    );

    console.log(
  "Coincidencia principal:",
  inventario
    ? inventario.numeroParte
    : "Sin coincidencia"
);

console.log(
  "Coincidencias encontradas:",
  coincidenciasInventario.length
);
    return res.json({
      success: true,

      mensaje:
        "La fotografía fue analizada con Gemini.",

      simulacion: false,

      archivo: {
        nombre: req.file.originalname,
        nombreGuardado: req.file.filename,
        tipo: req.file.mimetype,
        tamaño: req.file.size,
      },

      analisis: analisisCompatible,

      inventarioEncontrado:
        Boolean(inventario),

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

    const errorText = String(
      error.message || ""
    ).toLowerCase();

    if (
      errorText.includes("api key") ||
      errorText.includes("unauthorized") ||
      errorText.includes("permission")
    ) {
      statusCode = 401;
      mensaje =
        "La clave de Gemini no es válida o no tiene permisos.";
    }

    if (
      errorText.includes("quota") ||
      errorText.includes("rate limit") ||
      errorText.includes("resource exhausted")
    ) {
      statusCode = 429;
      mensaje =
        "Se alcanzó el límite disponible de Gemini. Intenta nuevamente más tarde.";
    }

    return res.status(statusCode).json({
      success: false,
      mensaje,
    });
  }
}

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

app.use((error, req, res, next) => {
  console.error(
    "Error del servidor:",
    error
  );

  if (
    error instanceof multer.MulterError
  ) {
    return res.status(400).json({
      success: false,

      mensaje:
        error.code === "LIMIT_FILE_SIZE"
          ? "La imagen no debe pesar más de 10 MB."
          : "No se pudo recibir la imagen.",
    });
  }

  return res.status(400).json({
    success: false,

    mensaje:
      error.message ||
      "Ocurrió un error inesperado en el servidor.",
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor iniciado en http://localhost:${PORT}`
  );

  console.log(
    "✅ Inventario SQLite disponible."
  );

  console.log(
    process.env.GEMINI_API_KEY
      ? "🤖 Gemini configurado."
      : "⚠️ GEMINI_API_KEY no configurada."
  );

  console.log(
    `📷 Modelo: ${
      process.env.GEMINI_MODEL ||
      "gemini-3.5-flash"
    }`
  );
});