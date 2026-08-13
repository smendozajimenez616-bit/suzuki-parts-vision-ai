const db = require("../database");

const SINONIMOS = {
  faro: [
    "faro",
    "lampara",
    "optica",
    "headlamp",
  ],

  fascia: [
    "fascia",
    "defensa",
    "parachoques",
    "bumper",
  ],

  collarin: [
    "collarin",
    "cojinete",
    "balero",
    "rodamiento",
    "desembrague",
    "release bearing",
  ],

  foco: [
    "foco",
    "bombilla",
    "bulbo",
    "lampara",
    "bulb",
  ],

  calavera: [
    "calavera",
    "stop",
    "luz trasera",
    "tail lamp",
  ],

  espejo: [
    "espejo",
    "retrovisor",
    "mirror",
  ],

  parrilla: [
    "parrilla",
    "rejilla",
    "grille",
  ],

  salpicadera: [
    "salpicadera",
    "guardafango",
    "fender",
  ],

  izquierda: [
    "izquierda",
    "izquierdo",
    "izq",
    "lh",
    "left",
  ],

  derecha: [
    "derecha",
    "derecho",
    "der",
    "rh",
    "right",
  ],

  delantera: [
    "delantera",
    "delantero",
    "frontal",
    "front",
  ],

  trasera: [
    "trasera",
    "trasero",
    "posterior",
    "rear",
  ],

  ambar: [
    "ambar",
    "amber",
    "direccional",
    "intermitente",
  ],
};

const PALABRAS_IGNORADAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "un",
  "una",
  "unos",
  "unas",
  "para",
  "por",
  "con",
  "sin",
  "y",
  "o",
  "en",
  "es",
  "se",
  "que",
  "probable",
  "posible",
  "pieza",
  "automotriz",
  "determinar",
  "determinado",
  "desconocido",
  "desconocida",
]);

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
    .filter(
      (palabra) =>
        palabra.length >= 2 &&
        !PALABRAS_IGNORADAS.has(palabra)
    );
}

function contienePalabra(texto, palabra) {
  const palabrasTexto = new Set(
    obtenerPalabras(texto)
  );

  return palabrasTexto.has(palabra);
}

function expandirTerminos(valor) {
  const texto = normalizarTexto(valor);
  const terminos = new Set(
    obtenerPalabras(texto)
  );

  Object.entries(SINONIMOS).forEach(
    ([terminoPrincipal, variantes]) => {
      const grupo = [
        terminoPrincipal,
        ...variantes,
      ].map(normalizarTexto);

      const coincide = grupo.some(
        (termino) => {
          const palabrasTermino =
            obtenerPalabras(termino);

          return palabrasTermino.every(
            (palabra) =>
              contienePalabra(texto, palabra)
          );
        }
      );

      if (coincide) {
        grupo.forEach((termino) => {
          obtenerPalabras(termino).forEach(
            (palabra) =>
              terminos.add(palabra)
          );
        });
      }
    }
  );

  return [...terminos];
}

function obtenerTodasLasRefacciones() {
  return new Promise((resolve, reject) => {
    db.all(
      `
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

function sumarCoincidencias({
  terminos,
  textoPrincipal,
  textoSecundario = "",
  puntosPrincipal,
  puntosSecundario = 0,
  coincidencias,
}) {
  terminos.forEach((termino) => {
    if (
      contienePalabra(
        textoPrincipal,
        termino
      )
    ) {
      coincidencias.push(termino);
      return puntosPrincipal;
    }

    if (
      textoSecundario &&
      contienePalabra(
        textoSecundario,
        termino
      )
    ) {
      coincidencias.push(termino);
      return puntosSecundario;
    }

    return 0;
  });

  return terminos.reduce(
    (total, termino) => {
      if (
        contienePalabra(
          textoPrincipal,
          termino
        )
      ) {
        return total + puntosPrincipal;
      }

      if (
        textoSecundario &&
        contienePalabra(
          textoSecundario,
          termino
        )
      ) {
        return total + puntosSecundario;
      }

      return total;
    },
    0
  );
}

function calcularPuntuacion(
  refaccion,
  analisis
) {
  const numeroParte = normalizarTexto(
    refaccion.numeroParte
  );

  const descripcion = normalizarTexto(
    refaccion.descripcion
  );

  const modelo = normalizarTexto(
    refaccion.modelo
  );

  const anio = normalizarTexto(
    refaccion.anio
  );

  const ubicacion = normalizarTexto(
    refaccion.ubicacion
  );

  const textoCompleto = [
    numeroParte,
    descripcion,
    modelo,
    anio,
    ubicacion,
  ]
    .filter(Boolean)
    .join(" ");

  const terminosPieza = expandirTerminos(
    [
      analisis.nombrePieza,
      analisis.descripcion,
      analisis.categoria,
    ].join(" ")
  );

  const terminosModelo = expandirTerminos(
    analisis.modeloProbable
  );

  const terminosPosicion =
    expandirTerminos(
      analisis.posicion
    );

  const terminosAnio = expandirTerminos(
    analisis.anioProbable
  );

  let puntuacion = 0;
  const coincidencias = [];

  puntuacion += sumarCoincidencias({
    terminos: terminosPieza,
    textoPrincipal: descripcion,
    textoSecundario: textoCompleto,
    puntosPrincipal: 4,
    puntosSecundario: 2,
    coincidencias,
  });

  puntuacion += sumarCoincidencias({
    terminos: terminosModelo,
    textoPrincipal: modelo,
    textoSecundario: descripcion,
    puntosPrincipal: 6,
    puntosSecundario: 5,
    coincidencias,
  });

  puntuacion += sumarCoincidencias({
    terminos: terminosPosicion,
    textoPrincipal: descripcion,
    puntosPrincipal: 3,
    coincidencias,
  });

  puntuacion += sumarCoincidencias({
    terminos: terminosAnio,
    textoPrincipal: anio,
    textoSecundario: descripcion,
    puntosPrincipal: 3,
    puntosSecundario: 2,
    coincidencias,
  });

  if (
    analisis.numeroParteVisible &&
    numeroParte ===
      normalizarTexto(
        analisis.numeroParteVisible
      )
  ) {
    puntuacion += 100;

    coincidencias.push(
      "numero-parte-exacto"
    );
  }

  return {
    puntuacion,

    coincidencias: [
      ...new Set(coincidencias),
    ],
  };
}

async function buscarCoincidencias(
  analisis,
  limite = 5
) {
  const refacciones =
    await obtenerTodasLasRefacciones();

  if (refacciones.length === 0) {
    return [];
  }

  const limiteSeguro = Math.max(
    1,
    Math.min(Number(limite) || 5, 20)
  );

  return refacciones
    .map((refaccion) => {
      const resultado =
        calcularPuntuacion(
          refaccion,
          analisis || {}
        );

      return {
        ...refaccion,

        puntuacionCoincidencia:
          resultado.puntuacion,

        palabrasCoincidentes:
          resultado.coincidencias,
      };
    })
    .filter(
      (refaccion) =>
        refaccion
          .puntuacionCoincidencia >= 4
    )
    .sort((primero, segundo) => {
      const diferenciaPuntuacion =
        segundo.puntuacionCoincidencia -
        primero.puntuacionCoincidencia;

      if (diferenciaPuntuacion !== 0) {
        return diferenciaPuntuacion;
      }

      return (
        Number(
          segundo.existencias || 0
        ) -
        Number(
          primero.existencias || 0
        )
      );
    })
    .slice(0, limiteSeguro);
}

module.exports = {
  buscarCoincidencias,
};