import logo from "../assets/logos.jpeg";

function Sidebar({ activePage, onNavigate }) {
  const menuItems = [
    { id: "dashboard", label: "Inicio" },
    { id: "identify", label: "Identificar pieza" },
    { id: "inventory", label: "Inventario" },
    { id: "history", label: "Historial" },
    { id: "reports", label: "Reportes" },
    { id: "settings", label: "Configuración" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-placeholder">
          <img
            src={logo}
            alt="Suzuki Parts Vision AI"
            className="logo-image"
          />
        </div>

        <div>
          <h2>Suzuki Parts</h2>
          <p>Vision AI</p>
        </div>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activePage === item.id
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="version">
        Versión 1.0
      </div>
    </aside>
  );
}

export default Sidebar;