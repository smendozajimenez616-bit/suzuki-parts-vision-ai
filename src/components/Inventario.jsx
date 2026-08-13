import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001";

const initialForm = {
  numeroParte: "",
  descripcion: "",
  modelo: "",
  anio: "",
  existencias: "",
  ubicacion: "",
  precio: "",
};

function Inventario() {
  const [refacciones, setRefacciones] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [pagination, setPagination] = useState({
    pagina: 1,
    limite: 50,
    total: 0,
    totalPaginas: 1,
    tieneAnterior: false,
    tieneSiguiente: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelName, setExcelName] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadInventory();
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [page, search]);

  async function loadInventory() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        pagina: String(page),
        limite: String(limit),
      });

      if (search.trim()) {
        params.set("buscar", search.trim());
      }

      const response = await fetch(
        `${API_URL}/api/inventario?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudo cargar el inventario."
        );
      }

      setRefacciones(
        Array.isArray(data.datos)
          ? data.datos
          : []
      );

      setPagination({
        pagina: Number(
          data.paginacion?.pagina || 1
        ),

        limite: Number(
          data.paginacion?.limite || limit
        ),

        total: Number(
          data.paginacion?.total || 0
        ),

        totalPaginas: Number(
          data.paginacion?.totalPaginas || 1
        ),

        tieneAnterior: Boolean(
          data.paginacion?.tieneAnterior
        ),

        tieneSiguiente: Boolean(
          data.paginacion?.tieneSiguiente
        ),
      });
    } catch (requestError) {
      console.error(
        "Error al cargar el inventario:",
        requestError
      );

      setRefacciones([]);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo conectar con el backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleExcelChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setExcelFile(null);
      setExcelName("");
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["xlsx", "xls", "xlsm"].includes(extension)) {
      setExcelFile(null);
      setExcelName("");
      setImportError(
        "Selecciona un archivo Excel válido (.xlsx, .xls o .xlsm)."
      );
      event.target.value = "";
      return;
    }

    setExcelFile(file);
    setExcelName(file.name);
    setImportMessage("");
    setImportError("");
  }

  async function handleImportExcel() {
    if (!excelFile) {
      setImportError("Selecciona un archivo de Excel.");
      return;
    }

    setImporting(true);
    setImportMessage("");
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("archivo", excelFile);

      const response = await fetch(
        `${API_URL}/api/inventario/importar-excel`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudo importar el inventario."
        );
      }

      const resumen = data.resumen || {};

      setImportMessage(
        `Inventario actualizado. Procesadas: ${Number(
          resumen.procesadas || 0
        )}, nuevas: ${Number(
          resumen.nuevas || 0
        )}, actualizadas: ${Number(
          resumen.actualizadas || 0
        )}.`
      );

      setExcelFile(null);
      setExcelName("");
      setSearch("");
      setPage(1);

      await loadInventory();
    } catch (requestError) {
      console.error(
        "Error al importar el inventario:",
        requestError
      );

      setImportError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo importar el inventario."
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.numeroParte.trim() ||
      !form.descripcion.trim()
    ) {
      setError(
        "El número de parte y la descripción son obligatorios."
      );

      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/refacciones`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            numeroParte:
              form.numeroParte.trim(),

            descripcion:
              form.descripcion.trim(),

            modelo: form.modelo.trim(),

            anio: form.anio.trim(),

            existencias: Number(
              form.existencias || 0
            ),

            ubicacion:
              form.ubicacion.trim(),

            precio: Number(
              form.precio || 0
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudo guardar la refacción."
        );
      }

      setForm(initialForm);

      setMessage(
        "Refacción agregada correctamente."
      );

      setPage(1);
      await loadInventory();
    } catch (requestError) {
      const messageText =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar la refacción.";

      if (
        messageText.includes(
          "UNIQUE constraint failed"
        )
      ) {
        setError(
          "Ese número de parte ya existe en el inventario."
        );
      } else {
        setError(messageText);
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePreviousPage() {
    if (
      !loading &&
      pagination.tieneAnterior
    ) {
      setPage((currentPage) =>
        Math.max(1, currentPage - 1)
      );
    }
  }

  function handleNextPage() {
    if (
      !loading &&
      pagination.tieneSiguiente
    ) {
      setPage((currentPage) =>
        currentPage + 1
      );
    }
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(value || 0));
  }

  function getStockClass(existencias) {
    const stock = Number(existencias || 0);

    if (stock <= 0) {
      return "stock-badge no-stock";
    }

    if (stock <= 2) {
      return "stock-badge low-stock";
    }

    return "stock-badge";
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Inventario</h1>

          <p>
            Administra las refacciones almacenadas
            en SQLite.
          </p>
        </div>

        <div className="user-card">
          <span className="user-avatar">
            S
          </span>

          <div>
            <strong>Salvador</strong>
            <small>Administrador</small>
          </div>
        </div>
      </header>

      <section className="inventory-layout">
        <article
          className="panel"
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="panel-header">
            <h2>Actualizar inventario desde Excel</h2>
            <p>
              Selecciona el archivo exportado desde Quiter.
              Las piezas existentes se actualizarán y las nuevas
              se agregarán automáticamente.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}
          >
            <label className="secondary-button">
              Seleccionar Excel
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={handleExcelChange}
                disabled={importing}
                hidden
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={handleImportExcel}
              disabled={!excelFile || importing}
            >
              {importing
                ? "Importando..."
                : "Importar inventario"}
            </button>

            <span style={{ color: "#53657a" }}>
              {excelName || "Ningún archivo seleccionado"}
            </span>
          </div>

          {importMessage && (
            <p className="inventory-success" style={{ marginTop: 14 }}>
              {importMessage}
            </p>
          )}

          {importError && (
            <p className="error-message" style={{ marginTop: 14 }}>
              {importError}
            </p>
          )}
        </article>

        <article className="panel inventory-form-panel">
          <div className="panel-header">
            <h2>Agregar refacción</h2>

            <p>
              Registra una pieza manualmente en el
              inventario.
            </p>
          </div>

          <form
            className="inventory-form"
            onSubmit={handleSubmit}
          >
            <label>
              Número de parte *
              <input
                type="text"
                name="numeroParte"
                value={form.numeroParte}
                onChange={handleChange}
                placeholder="Ejemplo: 71711-73R00"
                required
              />
            </label>

            <label>
              Descripción *
              <input
                type="text"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Ejemplo: Fascia delantera"
                required
              />
            </label>

            <label>
              Modelo
              <input
                type="text"
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                placeholder="Ejemplo: Ertiga"
              />
            </label>

            <label>
              Año o rango
              <input
                type="text"
                name="anio"
                value={form.anio}
                onChange={handleChange}
                placeholder="Ejemplo: 2022-2025"
              />
            </label>

            <label>
              Existencias
              <input
                type="number"
                name="existencias"
                min="0"
                value={form.existencias}
                onChange={handleChange}
                placeholder="0"
              />
            </label>

            <label>
              Ubicación
              <input
                type="text"
                name="ubicacion"
                value={form.ubicacion}
                onChange={handleChange}
                placeholder="Ejemplo: A-03"
              />
            </label>

            <label className="full-field">
              Precio
              <input
                type="number"
                name="precio"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={handleChange}
                placeholder="0.00"
              />
            </label>

            {message && (
              <p className="inventory-success">
                {message}
              </p>
            )}

            {error && (
              <p className="error-message inventory-message">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button full-field"
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : "Guardar refacción"}
            </button>
          </form>
        </article>

        <article className="panel inventory-list-panel">
          <div className="inventory-toolbar">
            <div className="panel-header">
              <h2>Refacciones registradas</h2>

              <p>
                Total: {pagination.total} refacciones
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={loadInventory}
              disabled={loading}
            >
              {loading
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          <input
            type="search"
            className="inventory-search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por número, descripción, modelo, año o ubicación..."
          />

          {loading ? (
            <div className="inventory-empty">
              <span className="spinner" />

              <p>Cargando inventario...</p>
            </div>
          ) : refacciones.length === 0 ? (
            <div className="inventory-empty">
              <strong>No hay resultados</strong>

              <p>
                Cambia la búsqueda o agrega una
                refacción.
              </p>
            </div>
          ) : (
            <>
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Número de parte</th>
                      <th>Descripción</th>
                      <th>Modelo</th>
                      <th>Año</th>
                      <th>Existencias</th>
                      <th>Ubicación</th>
                      <th>Precio</th>
                    </tr>
                  </thead>

                  <tbody>
                    {refacciones.map((part) => (
                      <tr key={part.id}>
                        <td>
                          <strong>
                            {part.numeroParte}
                          </strong>
                        </td>

                        <td>
                          {part.descripcion || "—"}
                        </td>

                        <td>
                          {part.modelo || "—"}
                        </td>

                        <td>
                          {part.anio || "—"}
                        </td>

                        <td>
                          <span
                            className={getStockClass(
                              part.existencias
                            )}
                          >
                            {Number(
                              part.existencias || 0
                            )}
                          </span>
                        </td>

                        <td>
                          {part.ubicacion || "—"}
                        </td>

                        <td>
                          {formatPrice(part.precio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="inventory-pagination">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handlePreviousPage}
                  disabled={
                    loading ||
                    !pagination.tieneAnterior
                  }
                >
                  Anterior
                </button>

                <span>
                  Página {pagination.pagina} de{" "}
                  {pagination.totalPaginas}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleNextPage}
                  disabled={
                    loading ||
                    !pagination.tieneSiguiente
                  }
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </article>
      </section>
    </>
  );
}

export default Inventario;