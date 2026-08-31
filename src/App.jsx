import { useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Inventario from "./components/Inventario";
import Historial from "./components/Historial";
import Reportes from "./components/Reportes";
import Barcode from "./components/Barcode";

import {
  identificarPieza,
} from "./services/visionService";

import API_URL from "./services/api";

import {
  imprimirCotizacionOficial,
} from "./utils/cotizacionPrinter";

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
    modeloVehiculo,
    setModeloVehiculo,
  ] = useState("");

  const [
    anioVehiculo,
    setAnioVehiculo,
  ] = useState("");

  const [
    versionVehiculo,
    setVersionVehiculo,
  ] = useState("");

  const [
    cantidadCotizacion,
    setCantidadCotizacion,
  ] = useState(1);

  const [
    vinVehiculo,
    setVinVehiculo,
  ] = useState("");

  // ==========================================
  // INSTALACIÓN SUZUKI TOLUCA
  // ==========================================

  const TARIFA_MANO_OBRA_MOSTRADOR =
    550;

  const [
    operacionInstalacion,
    setOperacionInstalacion,
  ] = useState("");

  const [
    tiempoInstalacion,
    setTiempoInstalacion,
  ] = useState("");

  const [
    fuenteTiempoInstalacion,
    setFuenteTiempoInstalacion,
  ] = useState("");

  const [
    conceptosAdicionales,
    setConceptosAdicionales,
  ] = useState("");

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

  // ==========================================
  // INTERÉS COMERCIAL
  // ==========================================

  const [
    interesaTomaCuenta,
    setInteresaTomaCuenta,
  ] = useState("");

  const [
    interesaPromociones,
    setInteresaPromociones,
  ] = useState("");

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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }
    };
  }, []);

  // ==========================================
  // CARGAR HISTORIAL
  // ==========================================

  useEffect(() => {
    if (activePage === "history") {
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

  function handleImageChange(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
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

    if (previewUrlRef.current) {
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
    setSelectedFileName(file.name);

    setResult(null);

    setClienteNombre("");
    setClienteTelefono("");

    setModeloVehiculo("");
    setAnioVehiculo("");
    setVersionVehiculo("");

    setCantidadCotizacion(1);

    setVinVehiculo("");
    setOperacionInstalacion("");
    setTiempoInstalacion("");
    setFuenteTiempoInstalacion("");
    setConceptosAdicionales("");

    // Limpiar las dos preguntas
    setInteresaTomaCuenta("");
    setInteresaPromociones("");

    setCotizacionError("");
    setCotizacionCreada(null);
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
    setCotizacionCreada(null);
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
        data.inventario || null;

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
          inventoryPart?.descripcion ||
          "Pieza no identificada",

        detail:
          analysis.detalle ||
          "No se recibió una descripción adicional.",

        partNumber:
          inventoryPart?.numeroParte ||
          analysis.numeroParte ||
          "Sin número de parte",

        model:
          inventoryPart?.modelo ||
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
          analysis.confianza ?? 0,

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
          data.simulacion === true,

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
  // CREAR COTIZACIÓN
  // ==========================================

  async function handleCrearCotizacion() {
    if (!result?.inventory) {
      setCotizacionError(
        "Primero debe existir una refacción identificada en el inventario."
      );

      return;
    }

    const nombre =
      clienteNombre.trim();

    const telefono =
      clienteTelefono.trim();

    const modelo =
      modeloVehiculo.trim();

    const anio =
      anioVehiculo.trim();

    const version =
      versionVehiculo.trim();

    const vin =
      vinVehiculo.trim();

    const cantidad =
      Math.max(
        1,
        Number(
          cantidadCotizacion
        ) || 1
      );

    if (
      !nombre ||
      !telefono ||
      !modelo ||
      !anio ||
      !version
    ) {
      setCotizacionError(
        "Completa nombre, teléfono, modelo, año y versión del vehículo. El VIN es recomendado, pero no obligatorio."
      );

      return;
    }

    // Las dos preguntas son obligatorias.
    if (
      !interesaTomaCuenta ||
      !interesaPromociones
    ) {
      setCotizacionError(
        "Responde Sí o No en las dos preguntas de interés del cliente."
      );

      return;
    }

    setCreandoCotizacion(true);

    setCotizacionError("");
    setCotizacionCreada(null);

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

            body: JSON.stringify({
              nombreCliente:
                nombre,

              telefonoCliente:
                telefono,

              modeloVehiculo:
                modelo,

              anioVehiculo:
                anio,

              versionVehiculo:
                version,

              vinVehiculo:
                vin,

              operacionInstalacion:
                operacionInstalacion.trim(),

              tiempoInstalacion:
                Number(
                  tiempoInstalacion || 0
                ),

              fuenteTiempo:
                fuenteTiempoInstalacion.trim(),

              conceptosAdicionales:
                conceptosAdicionales,

              // NUEVO
              interesaTomaCuenta:
                interesaTomaCuenta,

              // NUEVO
              interesaPromociones:
                interesaPromociones,

              items: [
                {
                  numeroParte:
                    result.inventory
                      .numeroParte,

                  descripcion:
                    result.inventory
                      .descripcion ||
                    result.description ||
                    "",

                  cantidad,

                  precioUnitario:
                    Number(
                      result.inventory
                        .precio || 0
                    ),
                },
              ],
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
      setCreandoCotizacion(false);
    }
  }
    // ==========================================
  // HISTORIAL
  // ==========================================

  async function cargarHistorial(
    buscar = historialBusqueda
  ) {
    setHistorialLoading(true);

    setHistorialError("");

    try {
      const params =
        new URLSearchParams({
          limite: "200",
        });

      if (buscar.trim()) {
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
      setHistorialLoading(false);
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

    setClienteNombre("");
    setClienteTelefono("");

    setModeloVehiculo("");
    setAnioVehiculo("");
    setVersionVehiculo("");

    setCantidadCotizacion(1);

    setVinVehiculo("");
    setOperacionInstalacion("");
    setTiempoInstalacion("");
    setFuenteTiempoInstalacion("");
    setConceptosAdicionales("");

    setInteresaTomaCuenta("");
    setInteresaPromociones("");

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

  function obtenerDatosInstalacion(
    totalRefacciones = 0
  ) {
    const horas =
      Number(tiempoInstalacion);

    const adicionales =
      Math.max(
        0,
        Number(
          conceptosAdicionales || 0
        )
      );

    const tiempoValido =
      Number.isFinite(horas) &&
      horas > 0 &&
      Boolean(
        fuenteTiempoInstalacion
      );

    const manoObra =
      tiempoValido
        ? horas *
          TARIFA_MANO_OBRA_MOSTRADOR
        : null;

    const totalInstalado =
      tiempoValido
        ? Number(
            totalRefacciones || 0
          ) +
          manoObra +
          adicionales
        : null;

    return {
      horas,
      adicionales,
      tiempoValido,
      manoObra,
      totalInstalado,
    };
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
  // PLANTILLA OFICIAL COMPARTIDA
  // ==========================================

  function imprimirCotizacion() {
    if (!cotizacionCreada) {
      return;
    }

    imprimirCotizacionOficial({
      ...cotizacionCreada,

      nombreCliente:
        cotizacionCreada.nombreCliente ||
        cotizacionCreada.cliente?.nombre ||
        clienteNombre,

      telefonoCliente:
        cotizacionCreada.telefonoCliente ||
        cotizacionCreada.cliente?.telefono ||
        clienteTelefono,

      modeloVehiculo:
        cotizacionCreada.modeloVehiculo ||
        modeloVehiculo,

      anioVehiculo:
        cotizacionCreada.anioVehiculo ||
        anioVehiculo,

      versionVehiculo:
        cotizacionCreada.versionVehiculo ||
        versionVehiculo,

      vinVehiculo:
        cotizacionCreada.vinVehiculo ||
        vinVehiculo,

      operacionInstalacion:
        cotizacionCreada.operacionInstalacion ||
        operacionInstalacion,

      tiempoInstalacion:
        cotizacionCreada.tiempoInstalacion ||
        tiempoInstalacion,

      fuenteTiempo:
        cotizacionCreada.fuenteTiempo ||
        cotizacionCreada
          .fuenteTiempoInstalacion ||
        fuenteTiempoInstalacion,

      conceptosAdicionales:
        cotizacionCreada
          .conceptosAdicionales ??
        conceptosAdicionales,
    });
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
                  src={selectedImage}
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
                    {result.description}
                  </h3>
                </div>

                <div className="confidence">
                  <strong>
                    {result.confidence}%
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
                      {result.partNumber}
                    </strong>
                  </dd>
                </div>

                <div>
                  <dt>
                    Modelo
                  </dt>

                  <dd>
                    {result.model}
                  </dd>
                </div>

                <div>
                  <dt>
                    Año o rango
                  </dt>

                  <dd>
                    {result.year}
                  </dd>
                </div>

                <div>
                  <dt>
                    Categoría
                  </dt>

                  <dd>
                    {result.category}
                  </dd>
                </div>

                <div>
                  <dt>
                    Posición
                  </dt>

                  <dd>
                    {result.position}
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

              {/* ================================= */}
              {/* DATOS DEL CLIENTE */}
              {/* ================================= */}

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
                          padding:
                            "10px 12px",
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
                        onChange={(
                          event
                        ) =>
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
                          padding:
                            "10px 12px",
                          borderRadius: 8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      VIN (recomendado)

                      <input
                        type="text"
                        value={
                          vinVehiculo
                        }
                        onChange={(
                          event
                        ) =>
                          setVinVehiculo(
                            event.target.value
                              .toUpperCase()
                          )
                        }
                        placeholder="Recomendado: 17 caracteres"
                        maxLength="17"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius: 8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      Modelo Suzuki

                      <input
                        type="text"
                        value={
                          modeloVehiculo
                        }
                        onChange={(
                          event
                        ) =>
                          setModeloVehiculo(
                            event.target.value
                          )
                        }
                        placeholder="Ejemplo: Swift"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius: 8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      Año

                      <input
                        type="text"
                        value={
                          anioVehiculo
                        }
                        onChange={(
                          event
                        ) =>
                          setAnioVehiculo(
                            event.target.value
                          )
                        }
                        placeholder="Ejemplo: 2024"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius: 8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                    <label>
                      Versión / Motor

                      <input
                        type="text"
                        value={
                          versionVehiculo
                        }
                        onChange={(
                          event
                        ) =>
                          setVersionVehiculo(
                            event.target.value
                          )
                        }
                        placeholder="Ejemplo: GLX 1.2L"
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius: 8,
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
                            event.target.value
                          )
                        }
                        disabled={
                          creandoCotizacion
                        }
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding:
                            "10px 12px",
                          borderRadius: 8,
                          border:
                            "1px solid #cbd5e1",
                        }}
                      />
                    </label>

                  </div>

                  {/* ================================= */}
                  {/* INSTALACIÓN SUZUKI TOLUCA */}
                  {/* ================================= */}

                  <div
                    style={{
                      marginTop: 20,
                      padding: 18,
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #dbe3ec",
                      borderRadius: 12,
                    }}
                  >
                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 6,
                        color: "#123f73",
                      }}
                    >
                      Instalación en Suzuki Toluca
                    </h4>

                    <p
                      style={{
                        marginTop: 0,
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      Toda cotización de mostrador
                      presenta la opción de instalación.
                      El tiempo solo debe capturarse
                      cuando provenga de una fuente
                      autorizada.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <label>
                        Operación de instalación

                        <input
                          type="text"
                          value={
                            operacionInstalacion
                          }
                          onChange={(
                            event
                          ) =>
                            setOperacionInstalacion(
                              event.target.value
                            )
                          }
                          placeholder="Ejemplo: Reemplazo de..."
                          disabled={
                            creandoCotizacion
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding:
                              "10px 12px",
                            borderRadius: 8,
                            border:
                              "1px solid #cbd5e1",
                          }}
                        />
                      </label>

                      <label>
                        Tiempo autorizado (horas)

                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={
                            tiempoInstalacion
                          }
                          onChange={(
                            event
                          ) =>
                            setTiempoInstalacion(
                              event.target.value
                            )
                          }
                          placeholder="Ejemplo: 1.5"
                          disabled={
                            creandoCotizacion
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding:
                              "10px 12px",
                            borderRadius: 8,
                            border:
                              "1px solid #cbd5e1",
                          }}
                        />
                      </label>

                      <label>
                        Fuente del tiempo

                        <select
                          value={
                            fuenteTiempoInstalacion
                          }
                          onChange={(
                            event
                          ) =>
                            setFuenteTiempoInstalacion(
                              event.target.value
                            )
                          }
                          disabled={
                            creandoCotizacion
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding:
                              "10px 12px",
                            borderRadius: 8,
                            border:
                              "1px solid #cbd5e1",
                            background:
                              "#ffffff",
                          }}
                        >
                          <option value="">
                            Pendiente de validación
                          </option>

                          <option value="Tiempo estándar oficial de Suzuki">
                            Tiempo estándar oficial de Suzuki
                          </option>

                          <option value="DMS Quiter">
                            DMS Quiter
                          </option>

                          <option value="Tabla interna validada por el jefe de Taller">
                            Tabla interna validada por el jefe de Taller
                          </option>

                          <option value="Historial de operaciones previamente autorizadas">
                            Historial de operaciones previamente autorizadas
                          </option>
                        </select>
                      </label>

                      <label>
                        Conceptos adicionales autorizados

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            conceptosAdicionales
                          }
                          onChange={(
                            event
                          ) =>
                            setConceptosAdicionales(
                              event.target.value
                            )
                          }
                          placeholder="0.00"
                          disabled={
                            creandoCotizacion
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding:
                              "10px 12px",
                            borderRadius: 8,
                            border:
                              "1px solid #cbd5e1",
                          }}
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 9,
                        background:
                          "#eff6ff",
                        border:
                          "1px solid #bfdbfe",
                        color: "#123f73",
                        fontWeight: 700,
                      }}
                    >
                      Tarifa especial de instalación
                      para clientes de mostrador:
                      $550 por hora, IVA incluido.
                    </div>

                    {!obtenerDatosInstalacion(
                      Number(
                        result.inventory.precio ||
                          0
                      ) *
                        Math.max(
                          1,
                          Number(
                            cantidadCotizacion
                          ) || 1
                        )
                    ).tiempoValido && (
                      <p
                        style={{
                          marginBottom: 0,
                          color: "#92400e",
                          fontWeight: 700,
                        }}
                      >
                        Tiempo de instalación
                        pendiente de validación por
                        Servicio. No se generará un
                        total instalado definitivo.
                      </p>
                    )}

                    {obtenerDatosInstalacion(
                      Number(
                        result.inventory.precio ||
                          0
                      ) *
                        Math.max(
                          1,
                          Number(
                            cantidadCotizacion
                          ) || 1
                        )
                    ).tiempoValido && (
                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div>
                          Mano de obra:{" "}
                          <strong>
                            {formatPrice(
                              obtenerDatosInstalacion(
                                Number(
                                  result.inventory
                                    .precio || 0
                                ) *
                                  Math.max(
                                    1,
                                    Number(
                                      cantidadCotizacion
                                    ) || 1
                                  )
                              ).manoObra
                            )}
                          </strong>
                        </div>

                        <div>
                          Total instalado:{" "}
                          <strong>
                            {formatPrice(
                              obtenerDatosInstalacion(
                                Number(
                                  result.inventory
                                    .precio || 0
                                ) *
                                  Math.max(
                                    1,
                                    Number(
                                      cantidadCotizacion
                                    ) || 1
                                  )
                              ).totalInstalado
                            )}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ================================= */}
                  {/* PREGUNTAS COMERCIALES */}
                  {/* ================================= */}

                  <div
                    style={{
                      marginTop: 20,
                      padding: 18,
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #dbe3ec",
                      borderRadius: 12,
                    }}
                  >

                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 6,
                        color: "#123f73",
                      }}
                    >
                      Oportunidades comerciales
                    </h4>

                    <p
                      style={{
                        marginTop: 0,
                        color: "#64748b",
                      }}
                    >
                      El asesor únicamente debe
                      marcar Sí o No.
                    </p>

                    {/* PREGUNTA 1 */}

                    <div
                      style={{
                        padding:
                          "14px 0",
                        borderBottom:
                          "1px solid #e2e8f0",
                      }}
                    >

                      <strong>
                        ¿Le gustaría conocer cuánto
                        podemos ofrecerle por su auto
                        como toma a cuenta?
                      </strong>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 10,
                          alignItems:
                            "center",
                        }}
                      >

                        <label
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 6,
                            cursor:
                              "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="interesaTomaCuenta"
                            value="Si"
                            checked={
                              interesaTomaCuenta ===
                              "Si"
                            }
                            onChange={() =>
                              setInteresaTomaCuenta(
                                "Si"
                              )
                            }
                            disabled={
                              creandoCotizacion
                            }
                          />

                          Sí
                        </label>

                        <label
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 6,
                            cursor:
                              "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="interesaTomaCuenta"
                            value="No"
                            checked={
                              interesaTomaCuenta ===
                              "No"
                            }
                            onChange={() =>
                              setInteresaTomaCuenta(
                                "No"
                              )
                            }
                            disabled={
                              creandoCotizacion
                            }
                          />

                          No
                        </label>

                      </div>

                      {interesaTomaCuenta ===
                        "Si" && (
                        <p
                          style={{
                            marginBottom: 0,
                            marginTop: 10,
                            color:
                              "#166534",
                            fontSize: 13,
                          }}
                        >
                          ✓ Se generará
                          automáticamente un
                          reporte para Seminuevos.
                        </p>
                      )}

                    </div>

                    {/* PREGUNTA 2 */}

                    <div
                      style={{
                        paddingTop: 14,
                      }}
                    >

                      <strong>
                        ¿Le gustaría recibir
                        información sobre
                        promociones comerciales
                        de autos nuevos?
                      </strong>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 10,
                          alignItems:
                            "center",
                        }}
                      >

                        <label
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 6,
                            cursor:
                              "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="interesaPromociones"
                            value="Si"
                            checked={
                              interesaPromociones ===
                              "Si"
                            }
                            onChange={() =>
                              setInteresaPromociones(
                                "Si"
                              )
                            }
                            disabled={
                              creandoCotizacion
                            }
                          />

                          Sí
                        </label>

                        <label
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 6,
                            cursor:
                              "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="interesaPromociones"
                            value="No"
                            checked={
                              interesaPromociones ===
                              "No"
                            }
                            onChange={() =>
                              setInteresaPromociones(
                                "No"
                              )
                            }
                            disabled={
                              creandoCotizacion
                            }
                          />

                          No
                        </label>

                      </div>

                      {interesaPromociones ===
                        "Si" && (
                        <p
                          style={{
                            marginBottom: 0,
                            marginTop: 10,
                            color:
                              "#166534",
                            fontSize: 13,
                          }}
                        >
                          ✓ Se generará
                          automáticamente un
                          reporte para Ventas.
                        </p>
                      )}

                    </div>

                  </div>

                  {/* ================================= */}
                  {/* BOTÓN CREAR COTIZACIÓN */}
                  {/* ================================= */}

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
                      {cotizacionError}
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
  // COTIZACIÓN CREADA
  // ==========================================

  function renderCotizacionCreada() {
    if (!cotizacionCreada) {
      return null;
    }

    const cotizacion =
      cotizacionCreada.cotizacion ||
      cotizacionCreada;

    const cliente =
      cotizacion.cliente || {
        nombre:
          cotizacion.nombreCliente ||
          clienteNombre ||
          "",
        telefono:
          cotizacion.telefonoCliente ||
          clienteTelefono ||
          "",
      };

    const items =
      Array.isArray(cotizacion.items)
        ? cotizacion.items
        : [];

    const modelo =
      cotizacion.modeloVehiculo ||
      modeloVehiculo ||
      "";

    const anio =
      cotizacion.anioVehiculo ||
      anioVehiculo ||
      "";

    const version =
      cotizacion.versionVehiculo ||
      versionVehiculo ||
      "";

    return (
      <div
        className="modal-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background:
            "rgba(15, 23, 42, 0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 9999,
          overflowY: "auto",
        }}
      >
        <div
          className="modal-card"
          style={{
            width: "100%",
            maxWidth: 900,
            maxHeight: "92vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 18,
            padding: 28,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          {/* ================================= */}
          {/* ENCABEZADO */}
          {/* ================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 20,
              flexWrap: "wrap",
              borderBottom:
                "2px solid #164a7f",
              paddingBottom: 18,
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#123f73",
                }}
              >
                Cotización
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color: "#64748b",
                }}
              >
                Suzuki Parts Vision AI
              </p>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <strong>
                Folio
              </strong>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#123f73",
                  marginTop: 4,
                }}
              >
                {cotizacion.folio ||
                  cotizacion.id ||
                  "—"}
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* DATOS CLIENTE */}
          {/* ================================= */}

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <h3
              style={{
                color: "#123f73",
                marginBottom: 14,
              }}
            >
              Datos del cliente
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Nombre
                </div>

                <strong>
                  {cliente.nombre ||
                    "—"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Teléfono
                </div>

                <strong>
                  {cliente.telefono ||
                    "—"}
                </strong>
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* VEHÍCULO */}
          {/* ================================= */}

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <h3
              style={{
                color: "#123f73",
                marginBottom: 14,
              }}
            >
              Vehículo actual
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  VIN
                </div>

                <strong>
                  {vinVehiculo || "—"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Modelo
                </div>

                <strong>
                  {modelo || "—"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Año
                </div>

                <strong>
                  {anio || "—"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Versión / Motor
                </div>

                <strong>
                  {version || "—"}
                </strong>
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* REFACCIONES */}
          {/* ================================= */}

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <h3
              style={{
                color: "#123f73",
                marginBottom: 14,
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
                        "#164a7f",
                      color: "white",
                    }}
                  >
                    <th
                      style={{
                        padding: 12,
                        textAlign:
                          "left",
                      }}
                    >
                      Número de parte
                    </th>

                    <th
                      style={{
                        padding: 12,
                        textAlign:
                          "left",
                      }}
                    >
                      Descripción
                    </th>

                    <th
                      style={{
                        padding: 12,
                        textAlign:
                          "center",
                      }}
                    >
                      Cant.
                    </th>

                    <th
                      style={{
                        padding: 12,
                        textAlign:
                          "right",
                      }}
                    >
                      Precio
                    </th>

                    <th
                      style={{
                        padding: 12,
                        textAlign:
                          "right",
                      }}
                    >
                      Subtotal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.length > 0 ? (
                    items.map(
                      (
                        item,
                        index
                      ) => (
                        <tr
                          key={
                            item.id ||
                            `${item.numeroParte}-${index}`
                          }
                          style={{
                            borderBottom:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <td
                            style={{
                              padding:
                                12,
                            }}
                          >
                            {item.numeroParte ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                            }}
                          >
                            {item.descripcion ||
                              "—"}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              textAlign:
                                "center",
                            }}
                          >
                            {item.cantidad ||
                              1}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              textAlign:
                                "right",
                            }}
                          >
                            {formatPrice(
                              item.precioUnitario ??
                                item.precio ??
                                0
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                12,
                              textAlign:
                                "right",
                              fontWeight:
                                700,
                            }}
                          >
                            {formatPrice(
                              item.subtotal ??
                                Number(
                                  item.cantidad ||
                                    1
                                ) *
                                  Number(
                                    item.precioUnitario ??
                                      item.precio ??
                                      0
                                  )
                            )}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          padding: 20,
                          textAlign:
                            "center",
                          color:
                            "#64748b",
                        }}
                      >
                        Cotización creada
                        correctamente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================= */}
          {/* TOTAL */}
          {/* ================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                minWidth: 260,
                background:
                  "#f8fafc",
                padding: 18,
                borderRadius: 12,
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 20,
                  fontSize: 18,
                }}
              >
                <strong>
                  Total
                </strong>

                <strong
                  style={{
                    color: "#123f73",
                  }}
                >
                  {formatPrice(
                    cotizacion.total ||
                      0
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* INSTALACIÓN SUZUKI TOLUCA */}
          {/* ================================= */}

          <div
            style={{
              marginBottom: 24,
              padding: 20,
              background: "#f8fafc",
              border:
                "1px solid #dbe3ec",
              borderRadius: 12,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#123f73",
              }}
            >
              Instalación en Suzuki Toluca
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Operación
                </div>

                <strong>
                  {operacionInstalacion ||
                    "Pendiente de validación por Servicio"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Tiempo estándar
                </div>

                <strong>
                  {obtenerDatosInstalacion(
                    cotizacion.total || 0
                  ).tiempoValido
                    ? `${tiempoInstalacion} h`
                    : "Pendiente de validación por Servicio"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Fuente del tiempo
                </div>

                <strong>
                  {fuenteTiempoInstalacion ||
                    "Pendiente de validación"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Tarifa especial
                </div>

                <strong>
                  $550.00 / hora
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Mano de obra
                </div>

                <strong>
                  {obtenerDatosInstalacion(
                    cotizacion.total || 0
                  ).tiempoValido
                    ? formatPrice(
                        obtenerDatosInstalacion(
                          cotizacion.total || 0
                        ).manoObra
                      )
                    : "Pendiente de validación"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Total instalado
                </div>

                <strong
                  style={{
                    color: "#123f73",
                  }}
                >
                  {obtenerDatosInstalacion(
                    cotizacion.total || 0
                  ).tiempoValido
                    ? formatPrice(
                        obtenerDatosInstalacion(
                          cotizacion.total || 0
                        ).totalInstalado
                      )
                    : "Pendiente de validación"}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 9,
                background: "#eff6ff",
                border:
                  "1px solid #bfdbfe",
                color: "#123f73",
                fontWeight: 700,
              }}
            >
              Tarifa especial de instalación
              para clientes de mostrador:
              $550 por hora, IVA incluido.
            </div>

            {!obtenerDatosInstalacion(
              cotizacion.total || 0
            ).tiempoValido && (
              <p
                style={{
                  marginBottom: 0,
                  color: "#92400e",
                  fontWeight: 700,
                }}
              >
                Tiempo de instalación pendiente
                de validación por Servicio. El
                total instalado no es definitivo.
              </p>
            )}
          </div>

          {/* ================================= */}
          {/* BOTONES */}
          {/* ================================= */}

          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent:
                "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setCotizacionCreada(
                  null
                );
              }}
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
          </>
        );

      case "inventory":
        return <Inventario />;

      case "history":
        return <Historial />;

      case "reports":
        return <Reportes />;

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

      {renderCotizacionCreada()}
    </div>
  );
}

export default App;
