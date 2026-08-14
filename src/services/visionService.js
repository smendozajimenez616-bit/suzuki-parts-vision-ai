import API_URL from "./api";

export async function identificarPieza(imagen) {
  const formData = new FormData();

  // Debe llamarse "image" porque así lo espera multer en el backend
  formData.append("image", imagen);

  const response = await fetch(`${API_URL}/api/identificar`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.mensaje || "Error al identificar la pieza"
    );
  }

  return data;
}