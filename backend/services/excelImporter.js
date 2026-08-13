const XLSX = require("xlsx");

function limpiarTexto(value) {
  return String(value ?? "").trim();
}

function convertirNumero(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const numberValue = Number(normalizedValue);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function obtenerValor(fila, nombresPosibles) {
  for (const nombre of nombresPosibles) {
    if (
      Object.prototype.hasOwnProperty.call(
        fila,
        nombre
      )
    ) {
      return fila[nombre];
    }
  }

  return "";
}

function convertirFilaQuiter(fila, index) {
  const numeroParte = limpiarTexto(
    obtenerValor(fila, [
      "Refacción",
      "Refaccion",
      "REFERENCIA",
      "Referencia",
    ])
  );

  const descripcion = limpiarTexto(
    obtenerValor(fila, [
      "Descripción",
      "Descripcion",
      "DESCRIPCION",
    ])
  );

  const ubicacion = limpiarTexto(
    obtenerValor(fila, [
      "Ubicacion",
      "Ubicación",
      "UBICACION",
    ])
  );

  const existencias = convertirNumero(
    obtenerValor(fila, [
      "Exist.",
      "Existencia",
      "Existencias",
      "STOCK",
    ])
  );

  const precio = convertirNumero(
    obtenerValor(fila, [
      "P.V.P.",
      "PVP",
      "Precio",
      "PRECIO",
    ])
  );

  if (!numeroParte) {
    return {
      valido: false,
      filaExcel: index + 2,
      error: "La fila no contiene número de parte.",
    };
  }

  return {
    valido: true,

    datos: {
      numeroParte,
      descripcion:
        descripcion || "SIN DESCRIPCIÓN",
      modelo: "",
      anio: "",
      existencias,
      ubicacion,
      precio,
    },
  };
}

function leerExcel(rutaArchivo) {
  const workbook = XLSX.readFile(rutaArchivo, {
    cellDates: false,
    raw: true,
  });

  const sheetName = workbook.SheetNames.includes(
    "Informe"
  )
    ? "Informe"
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "El archivo no contiene ninguna hoja."
    );
  }

  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(
    worksheet,
    {
      defval: "",
      raw: true,
    }
  );

  const refacciones = [];
  const errores = [];

  rawRows.forEach((fila, index) => {
    const resultado = convertirFilaQuiter(
      fila,
      index
    );

    if (resultado.valido) {
      refacciones.push(resultado.datos);
    } else {
      errores.push({
        fila: resultado.filaExcel,
        mensaje: resultado.error,
      });
    }
  });

  if (refacciones.length === 0) {
    throw new Error(
      "No se encontraron refacciones válidas en el Excel."
    );
  }

  return {
    hoja: sheetName,
    filasLeidas: rawRows.length,
    refacciones,
    errores,
  };
}

module.exports = {
  leerExcel,
};