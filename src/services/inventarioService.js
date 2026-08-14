import API_URL from "./api";

export async function obtenerInventario({
  buscar = "",
  pagina = 1,
  limite = 50,
} = {}) {
  const params = new URLSearchParams({
    buscar,
    pagina: String(pagina),
    limite: String(limite),
  });

  const response = await fetch(
    `${API_URL}/api/inventario?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.mensaje || "No se pudo obtener el inventario."
    );
  }

  return data;
}

export async function obtenerResumenInventario() {
  const response = await fetch(
    `${API_URL}/api/inventario/resumen`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.mensaje || "No se pudo obtener el resumen."
    );
  }

  return data;
}

export async function importarExcel(archivo) {
  const formData = new FormData();

  formData.append("archivo", archivo);

  const response = await fetch(
    `${API_URL}/api/inventario/importar-excel`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.mensaje || "No se pudo importar el archivo."
    );
  }

  return data;
}