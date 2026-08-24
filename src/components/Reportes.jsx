import { useEffect, useMemo, useState } from "react";
import API_URL from "../services/api";

function Reportes() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarReportes();
  }, []);

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

  function formatPrice(value) {
    return new Intl.NumberFormat(
      "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    ).format(Number(value || 0));
  }

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

    const conversionCompra =
      totalCotizaciones > 0
        ? (
            (estados.Aceptada /
              totalCotizaciones) *
            100
          ).toFixed(1)
        : "0.0";

    const conversionMonto =
      montos.total > 0
        ? (
            (montos.aceptado /
              montos.total) *
            100
          ).toFixed(1)
        : "0.0";

    return {
      totalCotizaciones,
      estados,
      montos,
      conversionCompra,
      conversionMonto,
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

  const motivosNoCompra = useMemo(() => {
    const motivosBase = [
      "Precio alto",
      "Sin presupuesto",
      "Compró con otro proveedor",
      "Tiempo de entrega",
      "Pieza incorrecta / no requerida",
      "Ya no requiere la pieza",
      "No respondió / sin seguimiento",
      "Otro",
    ];

    const conteo = {};

    motivosBase.forEach((motivo) => {
      conteo[motivo] = 0;
    });

    cotizaciones.forEach((item) => {
      if (item.estado !== "Rechazada") {
        return;
      }

      const motivo = String(
        item.motivoRechazo || ""
      ).trim();

      if (!motivo) {
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          conteo,
          motivo
        )
      ) {
        conteo[motivo] += 1;
      } else {
        conteo[motivo] = 1;
      }
    });

    return Object.entries(conteo)
      .map(([label, value]) => ({
        label,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [cotizaciones]);

  const maxMotivo = Math.max(
    1,
    ...motivosNoCompra.map(
      (item) => item.value
    )
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
            Consulta la conversión y el estado
            de las cotizaciones.
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
          label="Conversión de compra"
          value={
            cargando
              ? "..."
              : `${resumen.conversionCompra}%`
          }
          detail="Aceptadas / total"
        />

        <StatCard
          label="Conversión por monto"
          value={
            cargando
              ? "..."
              : `${resumen.conversionMonto}%`
          }
          detail="Monto aceptado / cotizado"
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
            onClick={cargarReportes}
            disabled={cargando}
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
                        borderRadius:
                          999,
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

      <section
        className="panel"
        style={{ marginTop: 22 }}
      >
        <div className="panel-header">
          <div>
            <h2>
              Motivos de no compra
            </h2>

            <p>
              Razones registradas en las
              cotizaciones rechazadas.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="empty-result">
            <strong>
              Cargando motivos...
            </strong>
          </div>
        ) : resumen.estados.Rechazada === 0 ? (
          <div className="empty-result">
            <strong>
              Aún no hay cotizaciones rechazadas.
            </strong>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              marginTop: 20,
            }}
          >
            {motivosNoCompra.map((item) => {
              const porcentaje =
                (item.value / maxMotivo) * 100;

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
                      background: "#e2e8f0",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width:
                          `${porcentaje}%`,
                        height: "100%",
                        background: "#dc2626",
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

export default Reportes;