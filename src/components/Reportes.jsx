import { useEffect, useMemo, useState } from "react";
import API_URL from "../services/api";

function Reportes() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [referidos, setReferidos] = useState([]);
  const [cargandoReferidos, setCargandoReferidos] =
    useState(true);
  const [errorReferidos, setErrorReferidos] = useState("");
  const [filtroArea, setFiltroArea] = useState("Todos");
  const [busquedaReferidos, setBusquedaReferidos] =
    useState("");

  const [reporteSeleccionado, setReporteSeleccionado] =
    useState(null);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    await Promise.all([
      cargarReportes(),
      cargarReferidos(),
    ]);
  }

  async function cargarReportes() {
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
            "No se pudieron cargar los reportes."
        );
      }

      setCotizaciones(
        Array.isArray(data.datos)
          ? data.datos
          : []
      );
    } catch (error) {
      console.error(
        "Error al cargar reportes:",
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

  async function cargarReferidos() {
    try {
      setCargandoReferidos(true);
      setErrorReferidos("");

      const response = await fetch(
        `${API_URL}/api/referidos`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudieron cargar las oportunidades comerciales."
        );
      }

      setReferidos(
        Array.isArray(data.datos)
          ? data.datos
          : []
      );
    } catch (error) {
      console.error(
        "Error al cargar referidos:",
        error
      );

      setErrorReferidos(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los referidos."
      );
    } finally {
      setCargandoReferidos(false);
    }
  }

  async function actualizarSeguimiento(
    id,
    nuevoEstado
  ) {
    const estadoAnterior =
      referidos.find(
        (item) => item.id === id
      )?.estadoSeguimiento || "Pendiente";

    setReferidos((anteriores) =>
      anteriores.map((item) =>
        item.id === id
          ? {
              ...item,
              estadoSeguimiento: nuevoEstado,
            }
          : item
      )
    );

    try {
      setErrorReferidos("");

      const response = await fetch(
        `${API_URL}/api/referidos/${id}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            estadoSeguimiento: nuevoEstado,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.mensaje ||
            "No se pudo actualizar el seguimiento."
        );
      }
    } catch (error) {
      console.error(
        "Error al actualizar seguimiento:",
        error
      );

      setReferidos((anteriores) =>
        anteriores.map((item) =>
          item.id === id
            ? {
                ...item,
                estadoSeguimiento:
                  estadoAnterior,
              }
            : item
        )
      );

      setErrorReferidos(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el seguimiento."
      );
    }
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

  function obtenerVehiculo(item) {
    const partes = [];

    if (item.modeloVehiculo) {
      partes.push(item.modeloVehiculo);
    }

    if (item.anioVehiculo) {
      partes.push(item.anioVehiculo);
    }

    if (item.versionVehiculo) {
      partes.push(item.versionVehiculo);
    }

    return partes.length > 0
      ? partes.join(" · ")
      : "—";
  }


  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function imprimirReporteComercial(item) {
    if (!item) {
      return;
    }

    const ventana = window.open(
      "",
      "_blank",
      "width=900,height=760"
    );

    if (!ventana) {
      alert(
        "El navegador bloqueó la ventana de impresión."
      );
      return;
    }

    const vehiculo = obtenerVehiculo(item);

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>
          Reporte ${escapeHtml(item.area || "Comercial")}
        </title>
        <style>
          * { box-sizing: border-box; }
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
            gap: 24px;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 5px solid #123f73;
          }
          .brand {
            font-size: 32px;
            font-weight: 900;
            color: #123f73;
          }
          .area {
            border: 1px solid #dbe3ec;
            border-radius: 12px;
            padding: 14px 18px;
            font-weight: 700;
          }
          h1 {
            margin: 30px 0 22px;
            color: #123f73;
          }
          h2 {
            margin: 0 0 14px;
            color: #123f73;
            font-size: 18px;
          }
          .box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 18px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          .label {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .message {
            line-height: 1.65;
            font-size: 16px;
          }
          .signature {
            margin-top: 70px;
            width: 280px;
            border-top: 1px solid #334155;
            text-align: center;
            padding-top: 8px;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">SUZUKI</div>
            <strong>Suzuki Parts Vision AI</strong>
            <div>Reporte comercial interno</div>
          </div>

          <div class="area">
            Área: ${escapeHtml(item.area || "—")}
          </div>
        </div>

        <h1>REPORTE COMERCIAL</h1>

        <div class="box">
          <h2>Datos de referencia</h2>
          <div class="grid">
            <div>
              <div class="label">Fecha</div>
              <strong>${escapeHtml(formatDate(item.fecha))}</strong>
            </div>
            <div>
              <div class="label">Folio de cotización</div>
              <strong>${escapeHtml(item.folioCotizacion || "—")}</strong>
            </div>
          </div>
        </div>

        <div class="box">
          <h2>Datos del cliente</h2>
          <div class="grid">
            <div>
              <div class="label">Nombre</div>
              <strong>${escapeHtml(item.nombreCliente || "—")}</strong>
            </div>
            <div>
              <div class="label">Teléfono</div>
              <strong>${escapeHtml(item.telefonoCliente || "—")}</strong>
            </div>
          </div>
        </div>

        <div class="box">
          <h2>Datos del vehículo</h2>
          <div class="grid">
            <div>
              <div class="label">Marca</div>
              <strong>Suzuki</strong>
            </div>
            <div>
              <div class="label">Modelo / Año / Versión</div>
              <strong>${escapeHtml(vehiculo)}</strong>
            </div>
          </div>
        </div>

        <div class="box">
          <h2>Oportunidad comercial</h2>
          <div class="message">
            ${escapeHtml(item.mensaje || "—")}
          </div>
        </div>

        <div class="box">
          <h2>Seguimiento</h2>
          <strong>
            ${escapeHtml(item.estadoSeguimiento || "Pendiente")}
          </strong>
        </div>

        <div class="signature">
          Asesor
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

  const referidosFiltrados =
    useMemo(() => {
      const busqueda =
        busquedaReferidos
          .trim()
          .toLowerCase();

      return referidos.filter(
        (item) => {
          if (
            filtroArea !== "Todos" &&
            item.area !== filtroArea
          ) {
            return false;
          }

          if (!busqueda) {
            return true;
          }

          const texto = [
            item.nombreCliente,
            item.telefonoCliente,
            item.folioCotizacion,
            item.modeloVehiculo,
            item.anioVehiculo,
            item.versionVehiculo,
            item.area,
            item.mensaje,
            item.estadoSeguimiento,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return texto.includes(busqueda);
        }
      );
    }, [
      referidos,
      filtroArea,
      busquedaReferidos,
    ]);

  const resumenReferidos =
    useMemo(() => {
      const seminuevos =
        referidos.filter(
          (item) =>
            item.area === "Seminuevos"
        ).length;

      const ventas =
        referidos.filter(
          (item) =>
            item.area === "Ventas"
        ).length;

      return {
        total: referidos.length,
        seminuevos,
        ventas,
      };
    }, [referidos]);

  const resumen = useMemo(() => {
    const estados = {
      Pendiente: 0,
      Enviada: 0,
      Aceptada: 0,
      Rechazada: 0,
      Vencida: 0,
    };

    const montos = {
      total: 0,
      aceptado: 0,
      rechazado: 0,
      pendiente: 0,
      enviada: 0,
      vencida: 0,
    };

    cotizaciones.forEach((item) => {
      const estado =
        item.estado || "Pendiente";

      const total =
        Number(item.total || 0);

      if (
        Object.prototype.hasOwnProperty.call(
          estados,
          estado
        )
      ) {
        estados[estado] += 1;
      }

      montos.total += total;

      if (estado === "Aceptada") {
        montos.aceptado += total;
      }

      if (estado === "Rechazada") {
        montos.rechazado += total;
      }

      if (estado === "Pendiente") {
        montos.pendiente += total;
      }

      if (estado === "Enviada") {
        montos.enviada += total;
      }

      if (estado === "Vencida") {
        montos.vencida += total;
      }
    });

    const totalCotizaciones =
      cotizaciones.length;

    const conversion =
      totalCotizaciones > 0
        ? (
            (estados.Aceptada /
              totalCotizaciones) *
            100
          ).toFixed(1)
        : "0.0";

    return {
      totalCotizaciones,
      estados,
      montos,
      conversion,
    };
  }, [cotizaciones]);

  const maxEstado = Math.max(
    1,
    resumen.estados.Pendiente,
    resumen.estados.Enviada,
    resumen.estados.Aceptada,
    resumen.estados.Rechazada,
    resumen.estados.Vencida
  );

  const barras = [
    {
      label: "Aceptadas",
      value: resumen.estados.Aceptada,
      color: "#16a34a",
    },
    {
      label: "Rechazadas",
      value: resumen.estados.Rechazada,
      color: "#dc2626",
    },
    {
      label: "Pendientes",
      value: resumen.estados.Pendiente,
      color: "#f59e0b",
    },
    {
      label: "Enviadas",
      value: resumen.estados.Enviada,
      color: "#2563eb",
    },
    {
      label: "Vencidas",
      value: resumen.estados.Vencida,
      color: "#64748b",
    },
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Reportes</h1>

          <p>
            Consulta oportunidades comerciales,
            conversión y estado de las cotizaciones.
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

      <section
        className="panel"
        style={{
          marginBottom: 22,
        }}
      >
        <div
          className="panel-header"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>
              Oportunidades comerciales
            </h2>

            <p>
              Clientes interesados en
              Seminuevos o Ventas.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={cargarReferidos}
            disabled={cargandoReferidos}
          >
            {cargandoReferidos
              ? "Actualizando..."
              : "Actualizar"}
          </button>
        </div>

        {errorReferidos && (
          <p className="error-message">
            {errorReferidos}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          <MiniCard
            label="Total de oportunidades"
            value={
              cargandoReferidos
                ? "..."
                : resumenReferidos.total
            }
          />

          <MiniCard
            label="Seminuevos"
            value={
              cargandoReferidos
                ? "..."
                : resumenReferidos.seminuevos
            }
          />

          <MiniCard
            label="Ventas"
            value={
              cargandoReferidos
                ? "..."
                : resumenReferidos.ventas
            }
          />
        </div>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            "Todos",
            "Seminuevos",
            "Ventas",
          ].map((area) => (
            <button
              key={area}
              type="button"
              onClick={() =>
                setFiltroArea(area)
              }
              style={{
                padding: "10px 16px",
                borderRadius: 9,
                border:
                  filtroArea === area
                    ? "1px solid #0f5fbd"
                    : "1px solid #cbd5e1",
                background:
                  filtroArea === area
                    ? "#0f5fbd"
                    : "#ffffff",
                color:
                  filtroArea === area
                    ? "#ffffff"
                    : "#123f73",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {area}
            </button>
          ))}

          <input
            type="search"
            value={busquedaReferidos}
            onChange={(event) =>
              setBusquedaReferidos(
                event.target.value
              )
            }
            placeholder="Buscar cliente, teléfono, vehículo o folio..."
            style={{
              flex: 1,
              minWidth: 250,
              padding: "11px 14px",
              borderRadius: 9,
              border:
                "1px solid #cbd5e1",
            }}
          />
        </div>

        {cargandoReferidos ? (
          <div className="empty-result">
            <strong>
              Cargando oportunidades...
            </strong>
          </div>
        ) : referidosFiltrados.length === 0 ? (
          <div
            className="empty-result"
            style={{
              marginTop: 20,
            }}
          >
            <strong>
              No hay oportunidades
              con este filtro.
            </strong>

            <p>
              Cuando un cliente marque Sí,
              aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: 20,
            }}
          >
            <table
              className="inventory-table"
              style={{
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Área</th>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Vehículo</th>
                  <th>Mensaje</th>
                  <th>Seguimiento</th>
                  <th>Reporte</th>
                </tr>
              </thead>

              <tbody>
                {referidosFiltrados.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        {formatDate(
                          item.fecha
                        )}
                      </td>

                      <td>
                        <AreaBadge
                          area={item.area}
                        />
                      </td>

                      <td>
                        <strong>
                          {item.folioCotizacion ||
                            "—"}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {item.nombreCliente ||
                            "—"}
                        </strong>
                      </td>

                      <td>
                        {item.telefonoCliente ||
                          "—"}
                      </td>

                      <td>
                        {obtenerVehiculo(
                          item
                        )}
                      </td>

                      <td
                        style={{
                          minWidth: 300,
                          maxWidth: 420,
                        }}
                      >
                        {item.mensaje ||
                          "—"}
                      </td>

                      <td>
                        <select
                          value={
                            item.estadoSeguimiento ||
                            "Pendiente"
                          }
                          onChange={(event) =>
                            actualizarSeguimiento(
                              item.id,
                              event.target.value
                            )
                          }
                          style={{
                            padding:
                              "8px 12px",
                            borderRadius: 999,
                            border:
                              "1px solid #cbd5e1",
                            background:
                              "#ffffff",
                            color:
                              "#123f73",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <option value="Pendiente">
                            Pendiente
                          </option>
                          <option value="Contactado">
                            Contactado
                          </option>
                          <option value="Atendido">
                            Atendido
                          </option>
                          <option value="Cerrado">
                            Cerrado
                          </option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            setReporteSeleccionado(
                              item
                            )
                          }
                          style={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          Generar reporte
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

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Cotizaciones"
          value={
            cargando
              ? "..."
              : resumen.totalCotizaciones
          }
          detail="Total registradas"
        />

        <StatCard
          label="Aceptadas"
          value={
            cargando
              ? "..."
              : resumen.estados.Aceptada
          }
          detail="Cotizaciones ganadas"
        />

        <StatCard
          label="Rechazadas"
          value={
            cargando
              ? "..."
              : resumen.estados.Rechazada
          }
          detail="Cotizaciones perdidas"
        />

        <StatCard
          label="Pendientes"
          value={
            cargando
              ? "..."
              : resumen.estados.Pendiente
          }
          detail="Por definir"
        />

        <StatCard
          label="Enviadas"
          value={
            cargando
              ? "..."
              : resumen.estados.Enviada
          }
          detail="En seguimiento"
        />

        <StatCard
          label="Vencidas"
          value={
            cargando
              ? "..."
              : resumen.estados.Vencida
          }
          detail="Fuera de vigencia"
        />

        <StatCard
          label="Conversión"
          value={
            cargando
              ? "..."
              : `${resumen.conversion}%`
          }
          detail="Aceptadas / total"
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <MoneyCard
          label="Monto total cotizado"
          value={
            cargando
              ? "..."
              : formatPrice(
                  resumen.montos.total
                )
          }
        />

        <MoneyCard
          label="Monto aceptado"
          value={
            cargando
              ? "..."
              : formatPrice(
                  resumen.montos.aceptado
                )
          }
        />

        <MoneyCard
          label="Monto rechazado"
          value={
            cargando
              ? "..."
              : formatPrice(
                  resumen.montos.rechazado
                )
          }
        />

        <MoneyCard
          label="Monto pendiente"
          value={
            cargando
              ? "..."
              : formatPrice(
                  resumen.montos.pendiente
                )
          }
        />
      </section>

      <section className="panel">
        <div
          className="panel-header"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>
              Conversión por estado
            </h2>

            <p>
              Resumen visual de las cotizaciones.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={cargarTodo}
            disabled={
              cargando ||
              cargandoReferidos
            }
          >
            {cargando
              ? "Actualizando..."
              : "Actualizar"}
          </button>
        </div>

        {cargando ? (
          <div className="empty-result">
            <strong>
              Cargando reportes...
            </strong>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
              marginTop: 20,
            }}
          >
            {barras.map((item) => {
              const porcentaje =
                (item.value /
                  maxEstado) *
                100;

              return (
                <div key={item.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      marginBottom: 7,
                    }}
                  >
                    <strong>
                      {item.label}
                    </strong>

                    <strong>
                      {item.value}
                    </strong>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 14,
                      background:
                        "#e2e8f0",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width:
                          `${porcentaje}%`,
                        height: "100%",
                        background:
                          item.color,
                        borderRadius: 999,
                        transition:
                          "width .25s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reporteSeleccionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(15, 23, 42, 0.68)",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 820,
              margin: "0 auto",
              background: "#ffffff",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow:
                "0 20px 60px rgba(0,0,0,.28)",
            }}
          >
            <div
              style={{
                padding: "26px 30px",
                borderBottom:
                  "5px solid #123f73",
                display: "flex",
                justifyContent:
                  "space-between",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#123f73",
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  SUZUKI
                </div>

                <strong>
                  Reporte comercial interno
                </strong>
              </div>

              <AreaBadge
                area={
                  reporteSeleccionado.area
                }
              />
            </div>

            <div
              style={{
                padding: 30,
              }}
            >
              <h1
                style={{
                  marginTop: 0,
                  color: "#123f73",
                }}
              >
                Reporte comercial
              </h1>

              <section
                style={{
                  background: "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#123f73",
                  }}
                >
                  Datos del cliente
                </h3>

                <p>
                  <strong>Nombre:</strong>{" "}
                  {reporteSeleccionado.nombreCliente ||
                    "—"}
                </p>

                <p>
                  <strong>Teléfono:</strong>{" "}
                  {reporteSeleccionado.telefonoCliente ||
                    "—"}
                </p>
              </section>

              <section
                style={{
                  background: "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#123f73",
                  }}
                >
                  Datos del vehículo
                </h3>

                <p>
                  <strong>Marca:</strong>{" "}
                  Suzuki
                </p>

                <p>
                  <strong>Modelo:</strong>{" "}
                  {reporteSeleccionado.modeloVehiculo ||
                    "—"}
                </p>

                <p>
                  <strong>Año:</strong>{" "}
                  {reporteSeleccionado.anioVehiculo ||
                    "—"}
                </p>

                <p>
                  <strong>
                    Versión / Motor:
                  </strong>{" "}
                  {reporteSeleccionado.versionVehiculo ||
                    "—"}
                </p>
              </section>

              <section
                style={{
                  background: "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#123f73",
                  }}
                >
                  Oportunidad comercial
                </h3>

                <p>
                  <strong>
                    Área:
                  </strong>{" "}
                  {reporteSeleccionado.area ||
                    "—"}
                </p>

                <p>
                  <strong>
                    Folio:
                  </strong>{" "}
                  {reporteSeleccionado.folioCotizacion ||
                    "—"}
                </p>

                <p>
                  <strong>
                    Fecha:
                  </strong>{" "}
                  {formatDate(
                    reporteSeleccionado.fecha
                  )}
                </p>

                <p
                  style={{
                    lineHeight: 1.6,
                  }}
                >
                  {reporteSeleccionado.mensaje ||
                    "—"}
                </p>
              </section>

              <section
                style={{
                  background: "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <strong>
                  Seguimiento:
                </strong>{" "}
                {reporteSeleccionado.estadoSeguimiento ||
                  "Pendiente"}
              </section>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: 12,
                  marginTop: 26,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setReporteSeleccionado(
                      null
                    )
                  }
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    imprimirReporteComercial(
                      reporteSeleccionado
                    )
                  }
                >
                  Imprimir / Guardar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
}) {
  return (
    <article
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 20,
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.06)",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color: "#0f5fbd",
          fontSize: 34,
          lineHeight: 1,
        }}
      >
        {value}
      </strong>

      <small
        style={{
          display: "block",
          marginTop: 10,
          color: "#64748b",
        }}
      >
        {detail}
      </small>
    </article>
  );
}

function MoneyCard({
  label,
  value,
}) {
  return (
    <article
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 22,
        border:
          "1px solid #dbe3ec",
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 25,
          color: "#123f73",
        }}
      >
        {value}
      </strong>
    </article>
  );
}

function MiniCard({
  label,
  value,
}) {
  return (
    <article
      style={{
        padding: 16,
        borderRadius: 12,
        background: "#f8fafc",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          fontSize: 28,
          color: "#123f73",
          marginTop: 6,
        }}
      >
        {value}
      </strong>
    </article>
  );
}

function AreaBadge({
  area,
}) {
  const esSeminuevos =
    area === "Seminuevos";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "7px 11px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        background:
          esSeminuevos
            ? "#f0fdf4"
            : "#eff6ff",
        color:
          esSeminuevos
            ? "#166534"
            : "#1d4ed8",
        border:
          esSeminuevos
            ? "1px solid #bbf7d0"
            : "1px solid #bfdbfe",
      }}
    >
      {area || "—"}
    </span>
  );
}

export default Reportes;
