import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Inventario from "./components/Inventario";
import Barcode from "./components/Barcode";
import "./App.css";

function App() {
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [activePage, setActivePage] = useState("dashboard");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [selectedMatch, setSelectedMatch] =
  useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function handleNavigate(page) {
    setActivePage(page);
  }

  function handleSelectImage() {
    fileInputRef.current?.click();
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Selecciona un archivo de imagen válido."
      );
      setStatus("error");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(
        "La imagen no debe pesar más de 10 MB."
      );
      setStatus("error");
      event.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const imageUrl = URL.createObjectURL(file);

    previewUrlRef.current = imageUrl;

    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setSelectedFileName(file.name);
    setResult(null);
    setSelectedMatch(null);
    setErrorMessage("");
    setStatus("ready");

    event.target.value = "";
  }

  async function handleAnalyze() {
    if (!selectedFile || status === "analyzing") {
      return;
    }

    setStatus("analyzing");
    setResult(null);
    setErrorMessage("");

    try {
      const formData = new FormData();

      formData.append("image", selectedFile);

      const response = await fetch(
        "http://localhost:3001/api/identificar",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "El backend no pudo procesar la imagen."
        );
      }

      const inventoryPart = data.inventario || null;
      const analysis = data.analisis || {};
      const matches = Array.isArray(
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

        /*
         * Primero usamos el número confirmado en SQLite.
         * Solo usamos el número detectado por Gemini si no
         * existe una coincidencia en el inventario.
         */
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
          Array.isArray(analysis.textoVisible)
            ? analysis.textoVisible
            : [],

        warnings:
          Array.isArray(analysis.advertencias)
            ? analysis.advertencias
            : [],

        inventoryFound:
          Boolean(data.inventarioEncontrado),

    inventory: inventoryPart,

matches,

selectedMatch:
  inventoryPart || matches[0] || null,

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

      setSelectedMatch(
        inventoryPart || matches[0] || null
      );
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

  function handleClearImage() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current = null;
    }

    setSelectedFile(null);
    setSelectedImage(null);
    setSelectedFileName("");
    setResult(null);
    setSelectedMatch(null);
    setErrorMessage("");
    setStatus("idle");
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) {
      return "—";
    }

    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(value || 0));
  }

  function renderHeader(title, description) {
    return (
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="user-card">
          <span className="user-avatar">S</span>

          <div>
            <strong>Salvador</strong>
            <small>Administrador</small>
          </div>
        </div>
      </header>
    );
  }

  function renderIdentifySection() {
    return (
      <section className="workspace">
        <article className="panel photo-panel">
          <div className="panel-header">
            <h2>Identificar refacción</h2>

            <p>
              Selecciona una fotografía para
              analizarla con Gemini.
            </p>
          </div>

          <div className="upload-zone">
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="Vista previa de la refacción seleccionada"
                  className="image-preview"
                />

                <p className="file-name">
                  {selectedFileName}
                </p>

                {status === "analyzing" && (
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
                        Gemini está revisando la
                        imagen y buscando una
                        coincidencia en el
                        inventario.
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
                  Selecciona una fotografía clara
                  de la refacción.
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
                onClick={handleAnalyze}
                disabled={
                  !selectedFile ||
                  status === "analyzing"
                }
              >
                {status === "analyzing"
                  ? "Analizando..."
                  : "Identificar pieza"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleSelectImage}
                disabled={
                  status === "analyzing"
                }
              >
                Seleccionar imagen
              </button>

              {selectedImage && (
                <button
                  type="button"
                  className="text-button"
                  onClick={handleClearImage}
                  disabled={
                    status === "analyzing"
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
              onChange={handleImageChange}
              hidden
            />
          </div>
        </article>

        <article className="panel result-panel">
          <div className="panel-header">
            <h2>Resultado</h2>

            <p>
              Aquí aparecerá el análisis de Gemini
              y la información del inventario.
            </p>
          </div>

          {status === "success" && result ? (
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

                  <span>Confianza</span>
                </div>
              </div>

              {result.detail && (
                <p className="result-description">
                  {result.detail}
                </p>
              )}

              <dl className="result-details">
                <div>
                  <dt>Número de parte</dt>
                  <dd>
                    <strong>
                      {result.partNumber}
                    </strong>
                  </dd>
                </div>

                <div>
                  <dt>Modelo</dt>
                  <dd>{result.model}</dd>
                </div>

                <div>
                  <dt>Año o rango</dt>
                  <dd>{result.year}</dd>
                </div>

                <div>
                  <dt>Categoría</dt>
                  <dd>{result.category}</dd>
                </div>

                <div>
                  <dt>Posición</dt>
                  <dd>{result.position}</dd>
                </div>

                <div>
                  <dt>Nombre del archivo</dt>
                  <dd>{result.fileName}</dd>
                </div>

                <div>
                  <dt>Tipo de archivo</dt>
                  <dd>{result.fileType}</dd>
                </div>

                <div>
                  <dt>Tamaño</dt>
                  <dd>
                    {formatFileSize(
                      result.fileSize
                    )}
                  </dd>
                </div>
              </dl>

              {result.inventoryFound &&
              result.inventory ? (
                <div className="inventory-match">
                  <h4>
                    Coincidencia encontrada en el
                    inventario
                  </h4>

                  <dl className="result-details">
                    <div>
                      <dt>Número de parte</dt>
                      <dd>
                        <strong>
                          {selectedMatch?.numeroParte ||
                            "—"}
                        </strong>
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Descripción registrada
                      </dt>
                      <dd>
                        {selectedMatch?.descripcion || "--"}
                      </dd>
                    </div>

                    <div>
                      <dt>Modelo registrado</dt>  
                      <dd>
                       {selectedMatch?.modelo || "--"}
                      </dd>
                    </div>

                    <div>
                      <dt>Año registrado</dt>
                      <dd>
                      {selectedMatch?.anio || "--"}
                      </dd>
                    </div>

                    <div>
                      <dt>Existencias</dt>
                      <dd>
                    {selectedMatch?.existencias ?? 0}
                      </dd>
                    </div>

                    <div>
                      <dt>Ubicación</dt>
                      <dd>
                        {selectedMatch?.ubicacion || "--"}
                      </dd>
                    </div>

                    <div>
                      <dt>Precio</dt>
                      <dd>
                       {formatPrice(selectedMatch?.precio)} 
                      </dd>
                    </div>
                  </dl>
{Array.isArray(result.matches) &&
                result.matches.length > 0 && (
  <div className="matches-section">
    <h4>Posibles coincidencias</h4>

    <div className="matches-grid">
      {result.matches.map((item) => (
        <button
          key={`${item.id || item.numeroParte}-${item.numeroParte}`}
          type="button"
          className={
            selectedMatch?.numeroParte ===
            item.numeroParte
              ? "match-card active"
              : "match-card"
          }
          onClick={() =>
            setSelectedMatch(item)
          }
        >
          <strong>
            {item.numeroParte}
          </strong>

          <span>
            {item.descripcion}
          </span>

          <small>
            Stock:
            {" "}
            {item.existencias}
          </small>
        </button>
      ))}
    </div>
  </div>
)}
                  <div className="barcode-section">
                    <h4>Código de barras</h4>

                    <Barcode
                      value={selectedMatch?.numeroParte ||
 result.inventory.numeroParte}
                    />

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => window.print()}
                    >
                      Imprimir etiqueta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="inventory-not-found">
                  <strong>
                    No se encontró una coincidencia
                    segura en el inventario.
                  </strong>

                  <p>
                    Gemini describió la pieza, pero
                    no existe una refacción
                    suficientemente parecida en
                    SQLite.
                  </p>
                </div>
              )}

              {result.visibleText.length > 0 && (
                <div className="analysis-extra">
                  <h4>
                    Texto visible en la imagen
                  </h4>

                  <ul>
                    {result.visibleText.map(
                      (text, index) => (
                        <li key={`${text}-${index}`}>
                          {text}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="analysis-warnings">
                  <h4>Advertencias</h4>

                  <ul>
                    {result.warnings.map(
                      (warning, index) => (
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

              <p className="simulation-note">
                {result.message}

                {result.simulation
                  ? " Este resultado pertenece al simulador."
                  : ""}
              </p>
            </div>
          ) : status === "analyzing" ? (
            <div className="empty-result">
              <span
                className="spinner large-spinner"
                aria-hidden="true"
              />

              <strong>
                Analizando fotografía
              </strong>

              <p>
                Gemini está identificando la pieza
                y consultando SQLite.
              </p>
            </div>
          ) : (
            <div className="empty-result">
              <span>
                Sin identificación todavía
              </span>

              <p>
                Selecciona una imagen y pulsa
                “Identificar pieza”.
              </p>
            </div>
          )}
        </article>
      </section>
    );
  }

  function renderTemporaryPage(
    title,
    description
  ) {
    return (
      <>
        {renderHeader(title, description)}

        <section className="panel">
          <div className="empty-result">
            <span>{title}</span>

            <p>
              Esta pantalla será construida
              próximamente.
            </p>
          </div>
        </section>
      </>
    );
  }

  function renderCurrentPage() {
    switch (activePage) {
      case "dashboard":
        return (
          <>
            <Dashboard status={status} />
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
        return renderTemporaryPage(
          "Historial",
          "Consulta las identificaciones realizadas."
        );

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
            <Dashboard status={status} />
            {renderIdentifySection()}
          </>
        );
    }
  }

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App; 