import {
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Inventario from "./components/Inventario";
import Historial from "./components/Historial";
import Barcode from "./components/Barcode";

import {
  identificarPieza,
} from "./services/visionService";

import API_URL from "./services/api";

import "./App.css";

function App() {
  // ==========================================
  // IDENTIFICACIÓN
  // ==========================================

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [activePage, setActivePage] =
    useState("dashboard");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [
    selectedFileName,
    setSelectedFileName,
  ] = useState("");

  const [status, setStatus] =
    useState("idle");

  const [result, setResult] =
    useState(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  // ==========================================
  // CLIENTE Y COTIZACIÓN
  // ==========================================

  const [
    clienteNombre,
    setClienteNombre,
  ] = useState("");

  const [
    clienteTelefono,
    setClienteTelefono,
  ] = useState("");

  const [
    cantidadCotizacion,
    setCantidadCotizacion,
  ] = useState(1);

  const [
    creandoCotizacion,
    setCreandoCotizacion,
  ] = useState(false);

  const [
    cotizacionError,
    setCotizacionError,
  ] = useState("");

  const [
    cotizacionCreada,
    setCotizacionCreada,
  ] = useState(null);

  const [
    itemsCotizacion,
    setItemsCotizacion,
  ] = useState([]);

  // ==========================================
  // HISTORIAL
  // ==========================================

  const [
    historial,
    setHistorial,
  ] = useState([]);

  const [
    historialBusqueda,
    setHistorialBusqueda,
  ] = useState("");

  const [
    historialLoading,
    setHistorialLoading,
  ] = useState(false);

  const [
    historialError,
    setHistorialError,
  ] = useState("");

  // ==========================================
  // LIMPIAR URL DE IMAGEN
  // ==========================================

  useEffect(() => {
    return () => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }
    };
  }, []);

  // ==========================================
  // CARGAR HISTORIAL AL ENTRAR
  // ==========================================

  useEffect(() => {
    if (
      activePage === "history"
    ) {
      cargarHistorial();
    }
  }, [activePage]);

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  function handleNavigate(page) {
    setActivePage(page);
  }

  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================

  function handleSelectImage() {
    fileInputRef.current?.click();
  }

  function handleImageChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "Selecciona un archivo de imagen válido."
      );

      setStatus("error");

      event.target.value = "";

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setErrorMessage(
        "La imagen no debe pesar más de 10 MB."
      );

      setStatus("error");

      event.target.value = "";

      return;
    }

    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    const imageUrl =
      URL.createObjectURL(file);

    previewUrlRef.current =
      imageUrl;

    setSelectedFile(file);
    setSelectedImage(imageUrl);

    setSelectedFileName(
      file.name
    );

    setResult(null);

    // Conservamos los datos del cliente para poder
    // agregar varias refacciones a la misma cotización.
    setCantidadCotizacion(1);

    setCotizacionError("");

    setCotizacionCreada(
      null
    );

    setErrorMessage("");

    setStatus("ready");

    event.target.value = "";
  }

  // ==========================================
  // IDENTIFICAR PIEZA
  // ==========================================

  async function handleAnalyze() {
    if (
      !selectedFile ||
      status === "analyzing"
    ) {
      return;
    }

    setStatus("analyzing");

    setResult(null);

    setCotizacionError("");

    setCotizacionCreada(
      null
    );

    setErrorMessage("");

    try {
      const data =
        await identificarPieza(
          selectedFile
        );

      if (!data.success) {
        throw new Error(
          data.mensaje ||
            "El backend no pudo procesar la imagen."
        );
      }

      const inventoryPart =
        data.inventario ||
        null;

      const analysis =
        data.analisis || {};

      const matches =
        Array.isArray(
          data.coincidenciasInventario
        )
          ? data.coincidenciasInventario
          : [];

      setResult({
        description:
          analysis.descripcion ||
          inventoryPart
            ?.descripcion ||
          "Pieza no identificada",

        detail:
          analysis.detalle ||
          "No se recibió una descripción adicional.",

        partNumber:
          inventoryPart
            ?.numeroParte ||
          analysis.numeroParte ||
          "Sin número de parte",

        model:
          inventoryPart
            ?.modelo ||
          analysis.modelo ||
          "Sin determinar",

        year:
          inventoryPart?.anio ||
          analysis.anio ||
          "Sin determinar",

        category:
          analysis.categoria ||
          "Sin determinar",

        position:
          analysis.posicion ||
          "Sin determinar",

        confidence:
          analysis.confianza ??
          0,

        visibleText:
          Array.isArray(
            analysis.textoVisible
          )
            ? analysis.textoVisible
            : [],

        warnings:
          Array.isArray(
            analysis.advertencias
          )
            ? analysis.advertencias
            : [],

        inventoryFound:
          Boolean(
            data.inventarioEncontrado
          ),

        inventory:
          inventoryPart,

        matches,

        fileName:
          data.archivo?.nombre ||
          selectedFile.name,

        fileType:
          data.archivo?.tipo ||
          selectedFile.type,

        fileSize:
          data.archivo?.tamaño ||
          selectedFile.size,

        simulation:
          data.simulacion ===
          true,

        message:
          data.mensaje ||
          "Proceso completado correctamente.",
      });

      setStatus("success");
    } catch (error) {
      console.error(
        "Error al procesar la imagen:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el backend."
      );

      setStatus("error");
    }
  }

  // ==========================================
  // CARRITO / COTIZACIÓN
  // ==========================================

  function handleAgregarACotizacion() {
    if (!result?.inventory) {
      setCotizacionError(
        "Primero debe existir una refacción identificada en el inventario."
      );

      return;
    }

    const cantidad =
      Math.max(
        1,
        Number(
          cantidadCotizacion
        ) || 1
      );

    const nuevoItem = {
      numeroParte:
        result.inventory.numeroParte,

      descripcion:
        result.inventory.descripcion ||
        result.description ||
        "",

      cantidad,

      precioUnitario:
        Number(
          result.inventory.precio ||
          0
        ),
    };

    setItemsCotizacion(
      (itemsActuales) => {
        const indiceExistente =
          itemsActuales.findIndex(
            (item) =>
              item.numeroParte ===
              nuevoItem.numeroParte
          );

        if (indiceExistente >= 0) {
          return itemsActuales.map(
            (item, index) =>
              index === indiceExistente
                ? {
                    ...item,
                    cantidad:
                      Number(item.cantidad || 0) +
                      nuevoItem.cantidad,
                  }
                : item
          );
        }

        return [
          ...itemsActuales,
          nuevoItem,
        ];
      }
    );

    setCotizacionError("");
    setCantidadCotizacion(1);

    // Dejamos lista la pantalla para identificar
    // otra refacción sin perder cliente ni carrito.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    setSelectedFile(null);
    setSelectedImage(null);
    setSelectedFileName("");
    setResult(null);
    setErrorMessage("");
    setStatus("idle");
  }

  function handleQuitarItemCotizacion(
    numeroParte
  ) {
    setItemsCotizacion(
      (itemsActuales) =>
        itemsActuales.filter(
          (item) =>
            item.numeroParte !==
            numeroParte
        )
    );
  }

  function handleCambiarCantidadItem(
    numeroParte,
    nuevaCantidad
  ) {
    const cantidad =
      Math.max(
        1,
        Number(nuevaCantidad) || 1
      );

    setItemsCotizacion(
      (itemsActuales) =>
        itemsActuales.map(
          (item) =>
            item.numeroParte ===
            numeroParte
              ? {
                  ...item,
                  cantidad,
                }
              : item
        )
    );
  }

  function calcularTotalCotizacion() {
    return itemsCotizacion.reduce(
      (total, item) =>
        total +
        Number(
          item.precioUnitario || 0
        ) *
          Math.max(
            1,
            Number(
              item.cantidad
            ) || 1
          ),
      0
    );
  }

  async function handleCrearCotizacion() {
    const nombre =
      clienteNombre.trim();

    const telefono =
      clienteTelefono.trim();

    if (
      !nombre ||
      !telefono
    ) {
      setCotizacionError(
        "Escribe el nombre y el teléfono del cliente."
      );

      return;
    }

    if (
      itemsCotizacion.length === 0
    ) {
      setCotizacionError(
        "Agrega al menos una refacción a la cotización."
      );

      return;
    }

    setCreandoCotizacion(
      true
    );

    setCotizacionError("");

    setCotizacionCreada(
      null
    );

    try {
      const response =
        await fetch(
          `${API_URL}/api/cotizaciones`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                nombreCliente:
                  nombre,

                telefonoCliente:
                  telefono,

                items:
                  itemsCotizacion.map(
                    (item) => ({
                      numeroParte:
                        item.numeroParte,

                      descripcion:
                        item.descripcion,

                      cantidad:
                        Math.max(
                          1,
                          Number(
                            item.cantidad
                          ) || 1
                        ),

                      precioUnitario:
                        Number(
                          item.precioUnitario ||
                          0
                        ),
                    })
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.mensaje ||
            "No se pudo crear la cotización."
        );
      }

      setCotizacionCreada(
        data.cotizacion
      );

      setItemsCotizacion([]);
      setClienteNombre("");
      setClienteTelefono("");
      setCantidadCotizacion(1);
    } catch (error) {
      console.error(
        "Error al crear cotización:",
        error
      );

      setCotizacionError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cotización."
      );
    } finally {
      setCreandoCotizacion(
        false
      );
    }
  }

  // ==========================================
  // HISTORIAL
  // ==========================================

  async function cargarHistorial(
    buscar = historialBusqueda
  ) {
    setHistorialLoading(
      true
    );

    setHistorialError("");

    try {
      const params =
        new URLSearchParams({
          limite: "200",
        });

      if (
        buscar.trim()
      ) {
        params.set(
          "buscar",
          buscar.trim()
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/historial?${params.toString()}`
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.mensaje ||
            "No se pudo cargar el historial."
        );
      }

      setHistorial(
        Array.isArray(
          data.datos
        )
          ? data.datos
          : []
      );
    } catch (error) {
      console.error(
        "Error al cargar historial:",
        error
      );

      setHistorialError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial."
      );
    } finally {
      setHistorialLoading(
        false
      );
    }
  }

  function handleHistorialBuscar(
    event
  ) {
    event.preventDefault();

    cargarHistorial(
      historialBusqueda
    );
  }

  // ==========================================
  // LIMPIAR IDENTIFICACIÓN
  // ==========================================

  function handleClearImage() {
    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    setSelectedFile(null);

    setSelectedImage(null);

    setSelectedFileName("");

    setResult(null);

    // No borramos cliente ni carrito: así puede
    // cambiar de fotografía durante la misma cotización.
    setCantidadCotizacion(1);

    setCotizacionError("");

    setCotizacionCreada(
      null
    );

    setErrorMessage("");

    setStatus("idle");
  }

  // ==========================================
  // FORMATOS
  // ==========================================

  function formatFileSize(
    bytes
  ) {
    if (
      !Number.isFinite(bytes)
    ) {
      return "—";
    }

    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  function formatPrice(
    value
  ) {
    return new Intl.NumberFormat(
      "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    ).format(
      Number(value || 0)
    );
  }

  function formatDate(
    value
  ) {
    if (!value) {
      return "—";
    }

    const fecha =
      new Date(value);

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",

        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(fecha);
  }

  // ==========================================
  // IMPRIMIR COTIZACIÓN
  // ==========================================

  function escapeHtml(
    valor
  ) {
    return String(
      valor ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  function imprimirCotizacion() {
    if (
      !cotizacionCreada
    ) {
      return;
    }

    const cliente =
      cotizacionCreada
        .cliente || {};

    const items =
      Array.isArray(
        cotizacionCreada.items
      )
        ? cotizacionCreada
            .items
        : [];

    const fecha =
      new Intl.DateTimeFormat(
        "es-MX",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ).format(
        new Date()
      );

    const filas =
      items
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(
              item.cantidad
            )}</td>

            <td>
              ${escapeHtml(
                item.descripcion ||
                  "Refacción Suzuki"
              )}
            </td>

            <td>
              ${escapeHtml(
                item.numeroParte
              )}
            </td>

            <td class="money">
              ${escapeHtml(
                formatPrice(
                  item.precioUnitario
                )
              )}
            </td>

            <td class="money">
              ${escapeHtml(
                formatPrice(
                  item.subtotal
                )
              )}
            </td>
          </tr>
        `
        )
        .join("");

    const ventana =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!ventana) {
      alert(
        "El navegador bloqueó la ventana de impresión."
      );

      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />

        <title>
          Cotización ${escapeHtml(
            cotizacionCreada.folio
          )}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 35px;
            font-family: Arial, Helvetica, sans-serif;
            color: #1e293b;
            background: #ffffff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            border-bottom: 5px solid #123f73;
            padding-bottom: 24px;
          }

          .brand {
            font-size: 34px;
            font-weight: 900;
            color: #123f73;
          }

          .subtitle {
            margin-top: 5px;
            font-weight: 700;
          }

          .meta {
            border: 1px solid #dbe3ec;
            padding: 16px 20px;
            border-radius: 10px;
            min-width: 250px;
          }

          h1 {
            margin-top: 35px;
          }

          h2 {
            color: #123f73;
          }

          .client {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
          }

          .client-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }

          .label {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th {
            background: #123f73;
            color: white;
            padding: 12px;
            text-align: left;
          }

          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }

          .money {
            text-align: right;
          }

          .totals {
            width: 330px;
            margin-left: auto;
            margin-top: 25px;
            border: 1px solid #dbe3ec;
            border-radius: 10px;
            padding: 18px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .grand-total {
            color: #123f73;
            font-size: 20px;
            font-weight: 800;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }

          .conditions {
            margin-top: 35px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            line-height: 1.7;
          }

          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 70px;
            margin-top: 70px;
          }

          .signature {
            border-top: 1px solid #334155;
            text-align: center;
            padding-top: 8px;
          }

          @media print {
            body {
              padding: 10px;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">

          <div>
            <div class="brand">
              SUZUKI
            </div>

            <div class="subtitle">
              Suzuki Parts Vision AI
            </div>

            <p>
              Departamento de Refacciones
            </p>
          </div>

          <div class="meta">
            <div>
              <strong>
                Fecha:
              </strong>
              ${fecha}
            </div>

            <br />

            <div>
              <strong>
                Folio:
              </strong>
              ${escapeHtml(
                cotizacionCreada.folio
              )}
            </div>

            <br />

            <div>
              <strong>
                Vigencia:
              </strong>
              15 días naturales
            </div>
          </div>

        </div>

        <h1>
          COTIZACIÓN
        </h1>

        <div class="client">

          <h2>
            Datos del cliente
          </h2>

          <div class="client-grid">

            <div>
              <div class="label">
                Nombre
              </div>

              <strong>
                ${escapeHtml(
                  cliente.nombre ||
                    clienteNombre
                )}
              </strong>
            </div>

            <div>
              <div class="label">
                Teléfono
              </div>

              <strong>
                ${escapeHtml(
                  cliente.telefono ||
                    clienteTelefono
                )}
              </strong>
            </div>

            <div>
              <div class="label">
                Estado
              </div>

              <strong>
                ${escapeHtml(
                  cotizacionCreada.estado ||
                    "Pendiente"
                )}
              </strong>
            </div>

          </div>

        </div>

        <h2>
          Refacciones
        </h2>

        <table>

          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th>No. parte</th>
              <th>Precio unitario</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${filas}
          </tbody>

        </table>

        <div class="totals">

          <div class="total-row">
            <span>
              Subtotal
            </span>

            <strong>
              ${escapeHtml(
                formatPrice(
                  cotizacionCreada.subtotal
                )
              )}
            </strong>
          </div>

          <div class="total-row grand-total">
            <span>
              TOTAL
            </span>

            <span>
              ${escapeHtml(
                formatPrice(
                  cotizacionCreada.total
                )
              )}
            </span>
          </div>

        </div>

        <div class="conditions">

          <h2>
            Condiciones
          </h2>

          <ul>
            <li>
              Vigencia de la cotización:
              15 días naturales.
            </li>

            <li>
              Precios sujetos a cambio
              sin previo aviso.
            </li>

            <li>
              Disponibilidad sujeta al
              inventario al momento del
              pedido.
            </li>

            <li>
              La cotización no representa
              una reserva de inventario.
            </li>
          </ul>

        </div>

        <div class="signatures">

          <div class="signature">
            Cliente
          </div>

          <div class="signature">
            Asesor de refacciones
          </div>

        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>

      </body>
      </html>
    `);

    ventana.document.close();
  }

  // ==========================================
  // HEADER
  // ==========================================

  function renderHeader(
    title,
    description
  ) {
    return (
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="user-card">
          <span className="user-avatar">
            S
          </span>

          <div>
            <strong>
              Salvador
            </strong>

            <small>
              Administrador
            </small>
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // IDENTIFICAR
  // ==========================================

  function renderIdentifySection() {
    return (
      <section className="workspace">

        <article className="panel photo-panel">

          <div className="panel-header">
            <h2>
              Identificar refacción
            </h2>

            <p>
              Selecciona una fotografía
              para analizarla con Gemini.
            </p>
          </div>

          <div className="upload-zone">

            {selectedImage ? (
              <>
                <img
                  src={
                    selectedImage
                  }
                  alt="Vista previa"
                  className="image-preview"
                />

                <p className="file-name">
                  {selectedFileName}
                </p>

                {status ===
                  "analyzing" && (
                  <div className="analysis-status">

                    <span
                      className="spinner"
                      aria-hidden="true"
                    />

                    <div>
                      <strong>
                        Analizando fotografía...
                      </strong>

                      <p>
                        Gemini está revisando
                        la imagen y buscando
                        coincidencias.
                      </p>
                    </div>

                  </div>
                )}
              </>
            ) : (
              <>
                <div className="camera-icon">
                  📷
                </div>

                <h3>
                  Fotografía de la pieza
                </h3>

                <p>
                  Selecciona una fotografía
                  clara de la refacción.
                </p>
              </>
            )}

            {status === "error" && (
              <p className="error-message">
                {errorMessage}
              </p>
            )}

            <div className="actions">

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleAnalyze
                }
                disabled={
                  !selectedFile ||
                  status ===
                    "analyzing"
                }
              >
                {status ===
                "analyzing"
                  ? "Analizando..."
                  : "Identificar pieza"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={
                  handleSelectImage
                }
                disabled={
                  status ===
                  "analyzing"
                }
              >
                Seleccionar imagen
              </button>

              {selectedImage && (
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    handleClearImage
                  }
                  disabled={
                    status ===
                    "analyzing"
                  }
                >
                  Limpiar
                </button>
              )}

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleImageChange
              }
              hidden
            />

          </div>

        </article>

        <article className="panel result-panel">

          <div className="panel-header">

            <h2>
              Resultado
            </h2>

            <p>
              Aquí aparecerá el análisis
              de Gemini y la información
              del inventario.
            </p>

          </div>

          {status === "success" &&
          result ? (
            <div className="result-card">

              <div className="result-heading">

                <div>
                  <span className="success-badge">
                    Identificación completada
                  </span>

                  <h3>
                    {
                      result.description
                    }
                  </h3>
                </div>

                <div className="confidence">
                  <strong>
                    {
                      result.confidence
                    }
                    %
                  </strong>

                  <span>
                    Confianza
                  </span>
                </div>

              </div>

              {result.detail && (
                <p className="result-description">
                  {result.detail}
                </p>
              )}

              <dl className="result-details">

                <div>
                  <dt>
                    Número de parte
                  </dt>

                  <dd>
                    <strong>
                      {
                        result.partNumber
                      }
                    </strong>
                  </dd>
                </div>

                <div>
                  <dt>
                    Modelo
                  </dt>

                  <dd>
                    {
                      result.model
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Año o rango
                  </dt>

                  <dd>
                    {
                      result.year
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Categoría
                  </dt>

                  <dd>
                    {
                      result.category
                    }
                  </dd>
                </div>

                <div>
                  <dt>
                    Posición
                  </dt>

                  <dd>
                    {
                      result.position
                    }
                  </dd>
                </div>

              </dl>

              {result.inventoryFound &&
              result.inventory ? (
                <div className="inventory-match">

                  <h4>
                    Coincidencia encontrada
                    en el inventario
                  </h4>

                  <dl className="result-details">

                    <div>
                      <dt>
                        Número de parte
                      </dt>

                      <dd>
                        <strong>
                          {
                            result
                              .inventory
                              .numeroParte
                          }
                        </strong>
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Descripción
                      </dt>

                      <dd>
                        {
                          result
                            .inventory
                            .descripcion ||
                          "—"
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Existencias
                      </dt>

                      <dd>
                        {
                          result
                            .inventory
                            .existencias ??
                          0
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Ubicación
                      </dt>

                      <dd>
                        {
                          result
                            .inventory
                            .ubicacion ||
                          "—"
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Precio
                      </dt>

                      <dd>
                        {formatPrice(
                          result
                            .inventory
                            .precio
                        )}
                      </dd>
                    </div>

                  </dl>

                  <div className="barcode-section">

                    <h4>
                      Código de barras
                    </h4>

                    <Barcode
                      value={
                        result
                          .inventory
                          .numeroParte
                      }
                    />

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        window.print()
                      }
                    >
                      Imprimir etiqueta
                    </button>

                  </div>

                </div>
              ) : (
                <div className="inventory-not-found">

                  <strong>
                    No se encontró una
                    coincidencia segura en
                    el inventario.
                  </strong>

                  <p>
                    Gemini describió la
                    pieza, pero no existe
                    una refacción
                    suficientemente parecida
                    en SQLite.
                  </p>

                </div>
              )}

              {/* CLIENTE */}

              {result.inventoryFound &&
                result.inventory && (
                <div
                  className="inventory-match"
                  style={{
                    marginTop: 18,
                  }}
                >

                  <h4>
                    Datos del cliente
                  </h4>

                  <p className="result-description">
                    Captura los datos para
                    generar la cotización.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >

                    <label>
                      Nombre del cliente

                      <input
                        type="text"
                        value={
                          clienteNombre
                        }
                        onChange={(
                          event
                        ) =>
                          setClienteNombre(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Nombre completo"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width:
                            "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius:
                            8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      Teléfono

                      <input
                        type="tel"
                        value={
                          clienteTelefono
                        }
                        onChange={(
                          event
                        ) =>
                          setClienteTelefono(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Ejemplo: 7221234567"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width:
                            "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius:
                            8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      Cantidad

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          cantidadCotizacion
                        }
                        onChange={(
                          event
                        ) =>
                          setCantidadCotizacion(
                            event
                              .target
                              .value
                          )
                        }
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width:
                            "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius:
                            8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 12,
                      flexWrap:
                        "wrap",
                    }}
                  >

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        handleAgregarACotizacion
                      }
                      disabled={
                        creandoCotizacion
                      }
                    >
                      Agregar a cotización
                    </button>

                    <span>
                      Total estimado:{" "}

                      <strong>
                        {formatPrice(
                          Number(
                            result
                              .inventory
                              .precio ||
                              0
                          ) *
                            Math.max(
                              1,
                              Number(
                                cantidadCotizacion
                              ) ||
                                1
                            )
                        )}
                      </strong>
                    </span>

                  </div>

                  {cotizacionError && (
                    <p
                      className="error-message"
                      style={{
                        marginTop: 14,
                      }}
                    >
                      {
                        cotizacionError
                      }
                    </p>
                  )}

                </div>
              )}

              {result.visibleText
                .length > 0 && (
                <div className="analysis-extra">

                  <h4>
                    Texto visible en la imagen
                  </h4>

                  <ul>
                    {result.visibleText.map(
                      (
                        text,
                        index
                      ) => (
                        <li
                          key={`${text}-${index}`}
                        >
                          {text}
                        </li>
                      )
                    )}
                  </ul>

                </div>
              )}

              {result.warnings
                .length > 0 && (
                <div className="analysis-warnings">

                  <h4>
                    Advertencias
                  </h4>

                  <ul>
                    {result.warnings.map(
                      (
                        warning,
                        index
                      ) => (
                        <li
                          key={`${warning}-${index}`}
                        >
                          {warning}
                        </li>
                      )
                    )}
                  </ul>

                </div>
              )}

            </div>
          ) : status ===
            "analyzing" ? (
            <div className="empty-result">

              <span
                className="spinner large-spinner"
                aria-hidden="true"
              />

              <strong>
                Analizando fotografía
              </strong>

              <p>
                Gemini está identificando
                la pieza y consultando el
                inventario.
              </p>

            </div>
          ) : (
            <div className="empty-result">

              <span>
                Sin identificación todavía
              </span>

              <p>
                Selecciona una imagen y
                pulsa “Identificar pieza”.
              </p>

            </div>
          )}

        </article>

      </section>
    );
  }

  // ==========================================
  // COTIZACIÓN EN PROCESO
  // ==========================================

  function renderCotizacionEnProceso() {
    if (
      itemsCotizacion.length === 0
    ) {
      return null;
    }

    const total =
      calcularTotalCotizacion();

    return (
      <section
        className="panel"
        style={{
          marginTop: 22,
        }}
      >
        <div className="panel-header">
          <h2>
            Cotización en proceso
          </h2>

          <p>
            Puedes identificar y agregar más
            refacciones antes de crear el folio.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <label>
            Nombre del cliente

            <input
              type="text"
              value={
                clienteNombre
              }
              onChange={(event) =>
                setClienteNombre(
                  event.target.value
                )
              }
              placeholder="Nombre completo"
              disabled={
                creandoCotizacion
              }
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            />
          </label>

          <label>
            Teléfono

            <input
              type="tel"
              value={
                clienteTelefono
              }
              onChange={(event) =>
                setClienteTelefono(
                  event.target.value
                )
              }
              placeholder="Ejemplo: 7221234567"
              disabled={
                creandoCotizacion
              }
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            />
          </label>
        </div>

        <div
          style={{
            overflowX: "auto",
            width: "100%",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth: 820,
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#123f73",
                  color: "#ffffff",
                }}
              >
                <th style={cartThStyle}>
                  No. parte
                </th>

                <th style={cartThStyle}>
                  Descripción
                </th>

                <th style={cartThStyle}>
                  Cantidad
                </th>

                <th style={cartThStyle}>
                  Precio
                </th>

                <th style={cartThStyle}>
                  Subtotal
                </th>

                <th style={cartThStyle}>
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {itemsCotizacion.map(
                (item) => {
                  const subtotal =
                    Number(
                      item.precioUnitario ||
                      0
                    ) *
                    Math.max(
                      1,
                      Number(
                        item.cantidad
                      ) || 1
                    );

                  return (
                    <tr
                      key={
                        item.numeroParte
                      }
                      style={{
                        borderBottom:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        <strong>
                          {
                            item.numeroParte
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        {
                          item.descripcion
                        }
                      </td>

                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            item.cantidad
                          }
                          onChange={(
                            event
                          ) =>
                            handleCambiarCantidadItem(
                              item.numeroParte,
                              event.target.value
                            )
                          }
                          disabled={
                            creandoCotizacion
                          }
                          style={{
                            width: 80,
                            padding:
                              "8px 10px",
                            borderRadius:
                              8,
                            border:
                              "1px solid #cbd5e1",
                          }}
                        />
                      </td>

                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        {formatPrice(
                          item.precioUnitario
                        )}
                      </td>

                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        <strong>
                          {formatPrice(
                            subtotal
                          )}
                        </strong>
                      </td>

                      <td
                        style={
                          cartTdStyle
                        }
                      >
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            handleQuitarItemCotizacion(
                              item.numeroParte
                            )
                          }
                          disabled={
                            creandoCotizacion
                          }
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 22,
            paddingTop: 18,
            borderTop:
              "1px solid #e2e8f0",
          }}
        >
          <div>
            <strong>
              {
                itemsCotizacion.length
              }{" "}
              {
                itemsCotizacion.length ===
                1
                  ? "refacción"
                  : "refacciones"
              }
            </strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 20,
              }}
            >
              Total:{" "}
              <strong
                style={{
                  color:
                    "#123f73",
                }}
              >
                {formatPrice(
                  total
                )}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={
              handleCrearCotizacion
            }
            disabled={
              creandoCotizacion
            }
          >
            {
              creandoCotizacion
                ? "Creando cotización..."
                : "Crear cotización"
            }
          </button>
        </div>

        {cotizacionError && (
          <p
            className="error-message"
            style={{
              marginTop: 14,
            }}
          >
            {cotizacionError}
          </p>
        )}
      </section>
    );
  }

  const cartThStyle = {
    padding: "12px 14px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const cartTdStyle = {
    padding: "12px 14px",
    verticalAlign: "middle",
  };

  // ==========================================
  // COTIZACIÓN FORMAL
  // ==========================================

  function renderCotizacion() {
    if (
      !cotizacionCreada
    ) {
      return null;
    }

    const cliente =
      cotizacionCreada
        .cliente || {};

    const items =
      Array.isArray(
        cotizacionCreada.items
      )
        ? cotizacionCreada
            .items
        : [];

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background:
            "rgba(15, 23, 42, 0.70)",
          overflowY: "auto",
          padding: 25,
        }}
      >

        <div
          style={{
            maxWidth: 950,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >

          <div
            style={{
              padding: 30,
              borderBottom:
                "5px solid #123f73",
              display: "flex",
              justifyContent:
                "space-between",
              gap: 25,
              flexWrap: "wrap",
            }}
          >

            <div>
              <div
                style={{
                  color: "#123f73",
                  fontSize: 34,
                  fontWeight: 900,
                }}
              >
                SUZUKI
              </div>

              <strong>
                Suzuki Parts Vision AI
              </strong>

              <p>
                Departamento de Refacciones
              </p>
            </div>

            <div
              style={{
                border:
                  "1px solid #dbe3ec",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div>
                <strong>
                  Folio:
                </strong>{" "}
                {
                  cotizacionCreada.folio
                }
              </div>

              <div
                style={{
                  marginTop: 8,
                }}
              >
                <strong>
                  Vigencia:
                </strong>{" "}
                15 días
              </div>
            </div>

          </div>

          <div
            style={{
              padding: 30,
            }}
          >

            <h1>
              COTIZACIÓN
            </h1>

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 18,
              }}
            >

              <h3>
                Datos del cliente
              </h3>

              <p>
                <strong>
                  Nombre:
                </strong>{" "}
                {cliente.nombre ||
                  clienteNombre}
              </p>

              <p>
                <strong>
                  Teléfono:
                </strong>{" "}
                {cliente.telefono ||
                  clienteTelefono}
              </p>

              <p>
                <strong>
                  Estado:
                </strong>{" "}
                {
                  cotizacionCreada.estado
                }
              </p>

            </div>

            <h3
              style={{
                color: "#123f73",
                marginTop: 28,
              }}
            >
              Refacciones
            </h3>

            <div
              style={{
                overflowX: "auto",
              }}
            >

              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >

                <thead>
                  <tr
                    style={{
                      background:
                        "#123f73",
                      color: "white",
                    }}
                  >
                    <th
                      style={{
                        padding: 12,
                      }}
                    >
                      Cant.
                    </th>

                    <th
                      style={{
                        padding: 12,
                      }}
                    >
                      Descripción
                    </th>

                    <th
                      style={{
                        padding: 12,
                      }}
                    >
                      No. parte
                    </th>

                    <th
                      style={{
                        padding: 12,
                      }}
                    >
                      Precio
                    </th>

                    <th
                      style={{
                        padding: 12,
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={`${item.numeroParte}-${index}`}
                      >
                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {
                            item.cantidad
                          }
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {
                            item.descripcion
                          }
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {
                            item.numeroParte
                          }
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {formatPrice(
                            item.precioUnitario
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            fontWeight:
                              700,
                          }}
                        >
                          {formatPrice(
                            item.subtotal
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>

            <div
              style={{
                marginTop: 25,
                marginLeft: "auto",
                maxWidth: 320,
                border:
                  "1px solid #dbe3ec",
                borderRadius: 12,
                padding: 18,
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                }}
              >
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatPrice(
                    cotizacionCreada
                      .subtotal
                  )}
                </strong>
              </div>

              <hr />

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  color: "#123f73",
                  fontSize: 20,
                }}
              >
                <strong>
                  TOTAL
                </strong>

                <strong>
                  {formatPrice(
                    cotizacionCreada
                      .total
                  )}
                </strong>
              </div>

            </div>

            <div
              style={{
                marginTop: 30,
              }}
            >

              <h3>
                Condiciones
              </h3>

              <ul>
                <li>
                  Vigencia de 15 días naturales.
                </li>

                <li>
                  Precios sujetos a cambio.
                </li>

                <li>
                  Disponibilidad sujeta a inventario.
                </li>

                <li>
                  La cotización no representa una reserva.
                </li>
              </ul>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: 12,
                marginTop: 30,
              }}
            >

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCotizacionCreada(
                    null
                  )
                }
              >
                Cerrar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  imprimirCotizacion
                }
              >
                Imprimir / Guardar PDF
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==========================================
  // HISTORIAL
  // ==========================================

  function renderHistorial() {
    return (
      <>
        {renderHeader(
          "Historial",
          "Consulta todas las piezas solicitadas y cotizaciones registradas."
        )}

        <section className="panel">

          <div className="panel-header">

            <h2>
              Historial permanente
            </h2>

            <p>
              Los registros de este
              historial no se eliminan
              desde la aplicación.
            </p>

          </div>

          <form
            onSubmit={
              handleHistorialBuscar
            }
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >

            <input
              type="search"
              value={
                historialBusqueda
              }
              onChange={(event) =>
                setHistorialBusqueda(
                  event.target.value
                )
              }
              placeholder="Buscar cliente, teléfono, parte, folio o estado..."
              className="inventory-search"
              style={{
                flex: 1,
              }}
            />

            <button
              type="submit"
              className="primary-button"
            >
              Buscar
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setHistorialBusqueda(
                  ""
                );

                cargarHistorial(
                  ""
                );
              }}
            >
              Mostrar todo
            </button>

          </form>

          {historialError && (
            <p className="error-message">
              {historialError}
            </p>
          )}

          {historialLoading ? (
            <div className="inventory-empty">

              <span className="spinner" />

              <p>
                Cargando historial...
              </p>

            </div>
          ) : historial.length ===
            0 ? (
            <div className="inventory-empty">

              <strong>
                No hay registros
              </strong>

              <p>
                Las cotizaciones creadas
                aparecerán aquí.
              </p>

            </div>
          ) : (
            <div className="inventory-table-wrapper">

              <table className="inventory-table">

                <thead>
                  <tr>
                    <th>
                      Fecha
                    </th>

                    <th>
                      Folio
                    </th>

                    <th>
                      Cliente
                    </th>

                    <th>
                      Teléfono
                    </th>

                    <th>
                      No. parte
                    </th>

                    <th>
                      Descripción
                    </th>

                    <th>
                      Cant.
                    </th>

                    <th>
                      Precio
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historial.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >

                        <td>
                          {formatDate(
                            item.fecha
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              item.folioCotizacion
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            item.nombreCliente
                          }
                        </td>

                        <td>
                          {
                            item.telefonoCliente
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              item.numeroParte
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            item.descripcion
                          }
                        </td>

                        <td>
                          {
                            item.cantidad
                          }
                        </td>

                        <td>
                          {formatPrice(
                            item.precioUnitario
                          )}
                        </td>

                        <td>
                          {formatPrice(
                            item.subtotal
                          )}
                        </td>

                        <td>
                          {
                            item.estado
                          }
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

        </section>
      </>
    );
  }

  // ==========================================
  // PÁGINA TEMPORAL
  // ==========================================

  function renderTemporaryPage(
    title,
    description
  ) {
    return (
      <>
        {renderHeader(
          title,
          description
        )}

        <section className="panel">

          <div className="empty-result">

            <span>
              {title}
            </span>

            <p>
              Esta pantalla será
              construida próximamente.
            </p>

          </div>

        </section>
      </>
    );
  }

  // ==========================================
  // PÁGINA ACTUAL
  // ==========================================

  function renderCurrentPage() {
    switch (activePage) {
      case "dashboard":
        return (
          <>
            <Dashboard
              status={status}
            />

            {renderIdentifySection()}

            {renderCotizacionEnProceso()}
          </>
        );

      case "identify":
        return (
          <>
            {renderHeader(
              "Identificar pieza",
              "Carga una fotografía para analizarla con Gemini."
            )}

            {renderIdentifySection()}

            {renderCotizacionEnProceso()}
          </>
        );

      case "inventory":
        return <Inventario />;

     case "history":
  return <Historial />;

      case "reports":
        return renderTemporaryPage(
          "Reportes",
          "Consulta indicadores y estadísticas."
        );

      case "settings":
        return renderTemporaryPage(
          "Configuración",
          "Administra las opciones de la aplicación."
        );

      default:
        return (
          <>
            <Dashboard
              status={status}
            />

            {renderIdentifySection()}

            {renderCotizacionEnProceso()}
          </>
        );
    }
  }

  // ==========================================
  // APP
  // ==========================================

  return (
    <div className="app">

      <Sidebar
        activePage={
          activePage
        }
        onNavigate={
          handleNavigate
        }
      />

      <main className="main-content">
        {renderCurrentPage()}
      </main>

      {renderCotizacion()}

    </div>
  );
}

export default App;