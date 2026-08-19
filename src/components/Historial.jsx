import { useEffect, useState } from "react";
import API_URL from "../services/api";

function Historial() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [cotizacionSeleccionada, setCotizacionSeleccionada] =
    useState(null);

  const [detalleCargando, setDetalleCargando] =
    useState(false);

  const [detalleError, setDetalleError] =
    useState("");

  const [
    actualizandoEstadoId,
    setActualizandoEstadoId,
  ] = useState(null);

  const [rechazoPendiente, setRechazoPendiente] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [detalleMotivoRechazo, setDetalleMotivoRechazo] = useState("");

  const motivosRechazo = [
    "Precio alto",
    "Sin presupuesto",
    "Compró con otro proveedor",
    "Tiempo de entrega",
    "Pieza incorrecta / no requerida",
    "Ya no requiere la pieza",
    "No respondió / sin seguimiento",
    "Otro",
  ];

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  async function cargarCotizaciones() {
    try {
      setCargando(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/cotizaciones`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudieron cargar las cotizaciones."
        );
      }

      setCotizaciones(
        Array.isArray(data.datos)
          ? data.datos
          : []
      );
    } catch (error) {
      console.error(
        "Error al cargar cotizaciones:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el backend."
      );
    } finally {
      setCargando(false);
    }
  }

  async function verCotizacion(id) {
    try {
      setDetalleCargando(true);
      setDetalleError("");
      setCotizacionSeleccionada(null);

      const response = await fetch(
        `${API_URL}/api/cotizaciones/${id}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudo consultar la cotización."
        );
      }

      setCotizacionSeleccionada(
        data.cotizacion
      );
    } catch (error) {
      console.error(
        "Error al consultar cotización:",
        error
      );

      setDetalleError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar la cotización."
      );
    } finally {
      setDetalleCargando(false);
    }
  }

  async function guardarEstadoCotizacion(id, nuevoEstado, motivo = "", detalle = "") {
    try {
      setActualizandoEstadoId(id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/cotizaciones/${id}/estado`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado: nuevoEstado,
            motivoRechazo: nuevoEstado === "Rechazada" ? motivo : "",
            detalleMotivoRechazo: nuevoEstado === "Rechazada" ? detalle : "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.mensaje || "No se pudo actualizar el estado.");
      }

      const cambios = {
        estado: nuevoEstado,
        motivoRechazo: data.motivoRechazo || "",
        detalleMotivoRechazo: data.detalleMotivoRechazo || "",
      };

      setCotizaciones((actuales) =>
        actuales.map((item) =>
          item.id === id ? { ...item, ...cambios } : item
        )
      );

      setCotizacionSeleccionada((actual) =>
        actual?.id === id ? { ...actual, ...cambios } : actual
      );

      return true;
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado."
      );
      return false;
    } finally {
      setActualizandoEstadoId(null);
    }
  }

  async function cambiarEstadoCotizacion(id, nuevoEstado) {
    if (nuevoEstado === "Rechazada") {
      const cotizacion = cotizaciones.find((item) => item.id === id);

      setRechazoPendiente({
        id,
        folio: cotizacion?.folio || id,
      });
      setMotivoRechazo(cotizacion?.motivoRechazo || "");
      setDetalleMotivoRechazo(
        cotizacion?.detalleMotivoRechazo || ""
      );
      return;
    }

    await guardarEstadoCotizacion(id, nuevoEstado);
  }

  function cerrarModalRechazo() {
    setRechazoPendiente(null);
    setMotivoRechazo("");
    setDetalleMotivoRechazo("");
  }

  async function confirmarRechazo() {
    if (!rechazoPendiente) return;

    if (!motivoRechazo) {
      setError("Selecciona el motivo de no compra.");
      return;
    }

    if (motivoRechazo === "Otro" && !detalleMotivoRechazo.trim()) {
      setError("Escribe el motivo de no compra.");
      return;
    }

    const guardado = await guardarEstadoCotizacion(
      rechazoPendiente.id,
      "Rechazada",
      motivoRechazo,
      detalleMotivoRechazo.trim()
    );

    if (guardado) cerrarModalRechazo();
  }

  function formatPrice(value) {
    return new Intl.NumberFormat(
      "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    ).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const fecha = new Date(value);

    if (Number.isNaN(fecha.getTime())) {
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

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function imprimirCotizacionSeleccionada() {
    if (!cotizacionSeleccionada) {
      return;
    }

    const items =
      Array.isArray(
        cotizacionSeleccionada.items
      )
        ? cotizacionSeleccionada.items
        : [];

    const filas =
      items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(
                item.numeroParte
              )}</td>

              <td>${escapeHtml(
                item.descripcion ||
                  "Refacción Suzuki"
              )}</td>

              <td class="center">
                ${escapeHtml(
                  item.cantidad
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
                <strong>
                  ${escapeHtml(
                    formatPrice(
                      item.subtotal
                    )
                  )}
                </strong>
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
          Cotización #${escapeHtml(
            cotizacionSeleccionada.folio
          )}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 36px;
            font-family: Arial, Helvetica, sans-serif;
            color: #1e293b;
            background: #ffffff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            align-items: flex-start;
            border-bottom: 5px solid #123f73;
            padding-bottom: 22px;
          }

          .brand {
            color: #123f73;
            font-size: 34px;
            font-weight: 900;
          }

          .subtitle {
            margin-top: 5px;
            font-size: 16px;
            font-weight: 700;
          }

          .meta {
            min-width: 270px;
            border: 1px solid #dbe3ec;
            border-radius: 12px;
            padding: 16px 18px;
          }

          .meta-row {
            margin-bottom: 8px;
          }

          h1 {
            margin: 30px 0 18px;
          }

          h2 {
            color: #123f73;
          }

          .client {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
          }

          .client-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
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
            color: #ffffff;
            padding: 12px;
            text-align: left;
          }

          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }

          .center {
            text-align: center;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .total-box {
            width: 330px;
            margin-left: auto;
            margin-top: 26px;
            border: 1px solid #dbe3ec;
            border-radius: 12px;
            padding: 18px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            font-size: 20px;
            font-weight: 800;
            color: #123f73;
          }

          .conditions {
            margin-top: 34px;
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
            <div class="meta-row">
              <strong>Folio:</strong>
              ${escapeHtml(
                cotizacionSeleccionada.folio
              )}
            </div>

            <div class="meta-row">
              <strong>Fecha:</strong>
              ${escapeHtml(
                formatDate(
                  cotizacionSeleccionada.fecha
                )
              )}
            </div>

            <div class="meta-row">
              <strong>Estado:</strong>
              ${escapeHtml(
                cotizacionSeleccionada.estado ||
                  "Pendiente"
              )}
            </div>

            <div>
              <strong>Vigencia:</strong>
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
                  cotizacionSeleccionada.nombreCliente
                )}
              </strong>
            </div>

            <div>
              <div class="label">
                Teléfono
              </div>

              <strong>
                ${escapeHtml(
                  cotizacionSeleccionada.telefonoCliente
                )}
              </strong>
            </div>

            <div>
              <div class="label">
                Estado
              </div>

              <strong>
                ${escapeHtml(
                  cotizacionSeleccionada.estado ||
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
              <th>No. parte</th>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>

          <tbody>
            ${filas}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>
              TOTAL
            </span>

            <span>
              ${escapeHtml(
                formatPrice(
                  cotizacionSeleccionada.total
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
              inventario al momento del pedido.
            </li>

            <li>
              La cotización no representa una
              reserva de inventario.
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

  function getEstadoStyle(estado) {
    switch (estado) {
      case "Aceptada":
        return {
          background: "#dcfce7",
          color: "#166534",
          borderColor: "#86efac",
        };

      case "Rechazada":
        return {
          background: "#fee2e2",
          color: "#991b1b",
          borderColor: "#fca5a5",
        };

      case "Enviada":
        return {
          background: "#dbeafe",
          color: "#1d4ed8",
          borderColor: "#93c5fd",
        };

      case "Vencida":
        return {
          background: "#e2e8f0",
          color: "#475569",
          borderColor: "#cbd5e1",
        };

      case "Pendiente":
      default:
        return {
          background: "#fff7ed",
          color: "#9a3412",
          borderColor: "#fdba74",
        };
    }
  }

  const cotizacionesFiltradas =
    cotizaciones.filter((item) => {
      const textoBusqueda =
        busqueda
          .trim()
          .toLowerCase();

      if (!textoBusqueda) {
        return true;
      }

      const textoItem = [
        item.folio,
        item.nombreCliente,
        item.telefonoCliente,
        item.estado,
        item.motivoRechazo,
        item.detalleMotivoRechazo,
      ]
        .join(" ")
        .toLowerCase();

      return textoItem.includes(
        textoBusqueda
      );
    });

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Historial</h1>

          <p>
            Consulta todas las cotizaciones
            realizadas.
          </p>
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

      <section className="panel">

        <div className="panel-header">
          <h2>
            Historial permanente
          </h2>

          <p>
            Selecciona una cotización para
            consultar las piezas incluidas.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="Buscar cliente, teléfono, folio o estado..."
            style={{
              flex: 1,
              minWidth: 240,
              padding: "11px 12px",
              borderRadius: 8,
              border:
                "1px solid #cbd5e1",
            }}
          />

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setBusqueda("")
            }
          >
            Mostrar todo
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={
              cargarCotizaciones
            }
          >
            Actualizar
          </button>
        </div>

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        {cargando ? (
          <div className="empty-result">
            <strong>
              Cargando cotizaciones...
            </strong>
          </div>
        ) : cotizacionesFiltradas.length ===
          0 ? (
          <div className="empty-result">
            <strong>
              No hay cotizaciones
            </strong>

            <p>
              No se encontraron registros.
            </p>
          </div>
        ) : (
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
                minWidth: 900,
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
                  <th style={thStyle}>
                    Folio
                  </th>

                  <th style={thStyle}>
                    Fecha
                  </th>

                  <th style={thStyle}>
                    Cliente
                  </th>

                  <th style={thStyle}>
                    Teléfono
                  </th>

                  <th style={thStyle}>
                    Estado
                  </th>

                  <th style={thStyle}>
                    Total
                  </th>

                  <th style={thStyle}>
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {cotizacionesFiltradas.map(
                  (item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <td style={tdStyle}>
                        <strong>
                          {item.folio}
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        {formatDate(
                          item.fecha
                        )}
                      </td>

                      <td style={tdStyle}>
                        {
                          item.nombreCliente
                        }
                      </td>

                      <td style={tdStyle}>
                        {
                          item.telefonoCliente
                        }
                      </td>

                      <td style={tdStyle}>
                        <select
                          value={
                            item.estado ||
                            "Pendiente"
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarEstadoCotizacion(
                              item.id,
                              event.target.value
                            )
                          }
                          disabled={
                            actualizandoEstadoId ===
                            item.id
                          }
                          style={{
                            padding:
                              "7px 12px",
                            borderRadius:
                              999,
                            border:
                              "1px solid",
                            fontWeight:
                              700,
                            fontSize: 13,
                            cursor:
                              actualizandoEstadoId ===
                              item.id
                                ? "wait"
                                : "pointer",
                            outline: "none",
                            ...getEstadoStyle(
                              item.estado
                            ),
                          }}
                        >
                          <option value="Pendiente">
                            Pendiente
                          </option>

                          <option value="Enviada">
                            Enviada
                          </option>

                          <option value="Aceptada">
                            Aceptada
                          </option>

                          <option value="Rechazada">
                            Rechazada
                          </option>

                          <option value="Vencida">
                            Vencida
                          </option>
                        </select>
                      </td>

                      <td style={tdStyle}>
                        <strong>
                          {formatPrice(
                            item.total
                          )}
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            verCotizacion(
                              item.id
                            )
                          }
                        >
                          Ver cotización
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {rechazoPendiente && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.70)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#ffffff",
              borderRadius: 18,
              padding: 26,
              boxShadow: "0 20px 50px rgba(0,0,0,.25)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", color: "#123f73" }}>
              Motivo de no compra
            </h2>

            <p style={{ margin: "0 0 20px", color: "#64748b" }}>
              Cotización #{rechazoPendiente.folio}. Selecciona por qué
              el cliente no realizó la compra.
            </p>

            <label style={{ display: "block", fontWeight: 700, marginBottom: 7 }}>
              Motivo
            </label>

            <select
              value={motivoRechazo}
              onChange={(event) => {
                const valor = event.target.value;
                setMotivoRechazo(valor);
                if (valor !== "Otro") setDetalleMotivoRechazo("");
              }}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                marginBottom: 16,
              }}
            >
              <option value="">Selecciona un motivo...</option>
              {motivosRechazo.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>

            {motivoRechazo === "Otro" && (
              <>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 7 }}>
                  Especifica el motivo
                </label>
                <textarea
                  value={detalleMotivoRechazo}
                  onChange={(event) =>
                    setDetalleMotivoRechazo(event.target.value)
                  }
                  placeholder="Escribe el motivo..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    resize: "vertical",
                    marginBottom: 16,
                  }}
                />
              </>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={cerrarModalRechazo}
                disabled={actualizandoEstadoId === rechazoPendiente.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmarRechazo}
                disabled={actualizandoEstadoId === rechazoPendiente.id}
              >
                {actualizandoEstadoId === rechazoPendiente.id
                  ? "Guardando..."
                  : "Guardar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleCargando && (
        <div className="modal-overlay">
          <div className="modal-card">
            <strong>
              Cargando cotización...
            </strong>
          </div>
        </div>
      )}

      {detalleError && (
        <p className="error-message">
          {detalleError}
        </p>
      )}

      {cotizacionSeleccionada && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(15, 23, 42, 0.70)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 950,
              background: "#ffffff",
              borderRadius: 18,
              padding: 28,
              boxShadow:
                "0 20px 50px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 20,
                alignItems:
                  "flex-start",
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <div>
                <h2
                  style={{
                    margin:
                      "0 0 8px",
                  }}
                >
                  Cotización #
                  {
                    cotizacionSeleccionada.folio
                  }
                </h2>

                <p
                  style={{
                    margin: 0,
                    color:
                      "#64748b",
                  }}
                >
                  Detalle de las piezas
                  cotizadas.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCotizacionSeleccionada(
                    null
                  )
                }
              >
                Cerrar
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <InfoBox
                label="Cliente"
                value={
                  cotizacionSeleccionada.nombreCliente
                }
              />

              <InfoBox
                label="Teléfono"
                value={
                  cotizacionSeleccionada.telefonoCliente
                }
              />

              <InfoBox
                label="Fecha"
                value={formatDate(
                  cotizacionSeleccionada.fecha
                )}
              />

              <InfoBox
                label="Estado"
                value={
                  cotizacionSeleccionada.estado
                }
              />

              {cotizacionSeleccionada.estado === "Rechazada" && (
                <InfoBox
                  label="Motivo de no compra"
                  value={cotizacionSeleccionada.motivoRechazo}
                />
              )}

              {cotizacionSeleccionada.estado === "Rechazada" &&
                cotizacionSeleccionada.detalleMotivoRechazo && (
                  <InfoBox
                    label="Detalle del motivo"
                    value={cotizacionSeleccionada.detalleMotivoRechazo}
                  />
                )}
            </div>

            <h3
              style={{
                marginBottom: 12,
              }}
            >
              Piezas cotizadas
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
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "#123f73",
                      color: "#fff",
                    }}
                  >
                    <th style={thStyle}>
                      No. parte
                    </th>

                    <th style={thStyle}>
                      Descripción
                    </th>

                    <th style={thStyle}>
                      Cantidad
                    </th>

                    <th style={thStyle}>
                      Precio
                    </th>

                    <th style={thStyle}>
                      Subtotal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {Array.isArray(
                    cotizacionSeleccionada.items
                  ) &&
                    cotizacionSeleccionada.items.map(
                      (item) => (
                        <tr
                          key={
                            item.id
                          }
                          style={{
                            borderBottom:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <td
                            style={
                              tdStyle
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
                              tdStyle
                            }
                          >
                            {
                              item.descripcion
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              item.cantidad
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatPrice(
                              item.precioUnitario
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <strong>
                              {formatPrice(
                                item.subtotal
                              )}
                            </strong>
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
                width: "100%",
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
                  fontSize: 20,
                }}
              >
                <strong>
                  TOTAL
                </strong>

                <strong
                  style={{
                    color:
                      "#123f73",
                  }}
                >
                  {formatPrice(
                    cotizacionSeleccionada.total
                  )}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCotizacionSeleccionada(
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
                  imprimirCotizacionSeleccionada
                }
              >
                Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border:
          "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

const thStyle = {
  padding: "12px 14px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 14px",
  verticalAlign: "middle",
};

export default Historial;