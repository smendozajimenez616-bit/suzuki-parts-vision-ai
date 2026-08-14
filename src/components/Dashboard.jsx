import { useEffect, useState } from "react";
import API_URL from "../services/api";

function Dashboard({ status }) {
  const [resumen, setResumen] = useState({
    total: 0,
    sinExistencias: 0,
    existenciasBajas: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarResumen() {
      try {
        setCargando(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/inventario/resumen`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.mensaje ||
              "No se pudo cargar el resumen del inventario."
          );
        }

        setResumen({
          total: Number(data.datos?.total || 0),
          sinExistencias: Number(
            data.datos?.sinExistencias || 0
          ),
          existenciasBajas: Number(
            data.datos?.existenciasBajas || 0
          ),
        });
      } catch (error) {
        console.error(
          "Error al cargar el resumen:",
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

    cargarResumen();
  }, []);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Bienvenido</h1>
          <p>
            Sistema inteligente de refacciones Suzuki
          </p>
        </div>

        <div className="user-card">
          <span className="user-avatar">S</span>

          <div>
            <strong>Salvador</strong>
            <small>Administrador</small>
          </div>
        </div>
      </header>

      {error && (
        <p className="error-message">{error}</p>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Inventario</span>
          <strong>
            {cargando ? "..." : resumen.total}
          </strong>
          <small>Refacciones cargadas</small>
        </article>

        <article className="stat-card">
          <span>Imágenes enviadas</span>
          <strong>
            {status === "success" ? 1 : 0}
          </strong>
          <small>Recibidas por el backend</small>
        </article>

        <article className="stat-card">
          <span>Existencias bajas</span>
          <strong>
            {cargando
              ? "..."
              : resumen.existenciasBajas}
          </strong>
          <small>Requieren atención</small>
        </article>

        <article className="stat-card">
          <span>Sin existencias</span>
          <strong>
            {cargando
              ? "..."
              : resumen.sinExistencias}
          </strong>
          <small>Sin stock disponible</small>
        </article>
      </section>
    </>
  );
}

export default Dashboard;