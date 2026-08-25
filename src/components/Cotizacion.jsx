function Cotizacion({
  cotizacion,
  onCerrar,
}) {
  if (!cotizacion) {
    return null;
  }

  const cliente =
    cotizacion.cliente || {};

  const items =
    Array.isArray(cotizacion.items)
      ? cotizacion.items
      : [];

  // Datos del vehículo.
  // Primero intenta obtenerlos directamente de la cotización.
  // También contempla que en algún momento vengan dentro de cliente.
  const modeloVehiculo =
    cotizacion.modeloVehiculo ||
    cliente.modeloVehiculo ||
    "";

  const anioVehiculo =
    cotizacion.anioVehiculo ||
    cliente.anioVehiculo ||
    "";

  const versionVehiculo =
    cotizacion.versionVehiculo ||
    cliente.versionVehiculo ||
    "";

  function formatPrice(value) {
    return new Intl.NumberFormat(
      "es-MX",
      {
        style: "currency",
        currency: "MXN",
      }
    ).format(Number(value || 0));
  }

  function formatDate() {
    const fecha =
      cotizacion.fecha
        ? new Date(cotizacion.fecha)
        : new Date();

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(fecha);
  }

  function imprimirCotizacion() {
    window.print();
  }

  const estiloEtiqueta = {
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "5px",
  };

  return (
    <div
      className="cotizacion-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(15, 23, 42, 0.65)",
        zIndex: 9999,
        overflowY: "auto",
        padding: "30px 16px",
      }}
    >
      <div
        id="cotizacion-imprimible"
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow:
            "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        {/* ============================= */}
        {/* ENCABEZADO */}
        {/* ============================= */}

        <div
          style={{
            padding: "34px 40px",
            borderBottom:
              "5px solid #123f73",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "30px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: "900",
                  color: "#123f73",
                  letterSpacing: "-1px",
                }}
              >
                SUZUKI
              </div>

              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  marginTop: "4px",
                }}
              >
                Suzuki Parts Vision AI
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "#64748b",
                }}
              >
                Departamento de Refacciones
              </div>
            </div>

            <div
              style={{
                minWidth: "230px",
                border:
                  "1px solid #dbe3ec",
                borderRadius: "14px",
                padding: "16px 20px",
              }}
            >
              <div>
                <strong>Fecha: </strong>
                {formatDate()}
              </div>

              <div
                style={{
                  marginTop: "8px",
                }}
              >
                <strong>Folio: </strong>
                {cotizacion.folio || "—"}
              </div>

              <div
                style={{
                  marginTop: "8px",
                }}
              >
                <strong>Vigencia: </strong>
                15 días naturales
              </div>
            </div>
          </div>
        </div>

        {/* ============================= */}
        {/* CONTENIDO */}
        {/* ============================= */}

        <div
          style={{
            padding: "34px 40px",
          }}
        >
          <h1
            style={{
              margin: "0 0 28px",
              color: "#1e293b",
              fontSize: "30px",
            }}
          >
            COTIZACIÓN
          </h1>

          {/* ============================= */}
          {/* DATOS DEL CLIENTE */}
          {/* ============================= */}

          <section
            style={{
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                margin: "0 0 18px",
                fontSize: "18px",
                color: "#123f73",
              }}
            >
              Datos del cliente
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div style={estiloEtiqueta}>
                  Nombre
                </div>

                <strong>
                  {cliente.nombre || "—"}
                </strong>
              </div>

              <div>
                <div style={estiloEtiqueta}>
                  Teléfono
                </div>

                <strong>
                  {cliente.telefono || "—"}
                </strong>
              </div>

              <div>
                <div style={estiloEtiqueta}>
                  Estado
                </div>

                <strong>
                  {cotizacion.estado ||
                    "Pendiente"}
                </strong>
              </div>
            </div>
          </section>

          {/* ============================= */}
          {/* DATOS DEL VEHÍCULO */}
          {/* ============================= */}

          <section
            style={{
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                margin: "0 0 18px",
                fontSize: "18px",
                color: "#123f73",
              }}
            >
              Datos del vehículo
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div style={estiloEtiqueta}>
                  Marca
                </div>

                <strong>
                  Suzuki
                </strong>
              </div>

              <div>
                <div style={estiloEtiqueta}>
                  Modelo
                </div>

                <strong>
                  {modeloVehiculo || "—"}
                </strong>
              </div>

              <div>
                <div style={estiloEtiqueta}>
                  Año
                </div>

                <strong>
                  {anioVehiculo || "—"}
                </strong>
              </div>

              <div>
                <div style={estiloEtiqueta}>
                  Versión / Motor
                </div>

                <strong>
                  {versionVehiculo || "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* ============================= */}
          {/* REFACCIONES */}
          {/* ============================= */}

          <h2
            style={{
              color: "#123f73",
              marginBottom: "14px",
            }}
          >
            Refacciones
          </h2>

          <div
            style={{
              overflowX: "auto",
              border:
                "1px solid #dbe3ec",
              borderRadius: "12px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "700px",
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
                  <th
                    style={{
                      padding: "14px",
                      textAlign: "left",
                    }}
                  >
                    Cant.
                  </th>

                  <th
                    style={{
                      padding: "14px",
                      textAlign: "left",
                    }}
                  >
                    Descripción
                  </th>

                  <th
                    style={{
                      padding: "14px",
                      textAlign: "left",
                    }}
                  >
                    No. parte
                  </th>

                  <th
                    style={{
                      padding: "14px",
                      textAlign: "right",
                    }}
                  >
                    Precio unitario
                  </th>

                  <th
                    style={{
                      padding: "14px",
                      textAlign: "right",
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.length > 0 ? (
                  items.map(
                    (item, index) => (
                      <tr
                        key={`${item.numeroParte}-${index}`}
                        style={{
                          borderBottom:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <td
                          style={{
                            padding:
                              "14px",
                          }}
                        >
                          {item.cantidad}
                        </td>

                        <td
                          style={{
                            padding:
                              "14px",
                          }}
                        >
                          {item.descripcion ||
                            "Refacción Suzuki"}
                        </td>

                        <td
                          style={{
                            padding:
                              "14px",
                            fontWeight:
                              "700",
                          }}
                        >
                          {item.numeroParte ||
                            "—"}
                        </td>

                        <td
                          style={{
                            padding:
                              "14px",
                            textAlign:
                              "right",
                          }}
                        >
                          {formatPrice(
                            item.precioUnitario
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "14px",
                            textAlign:
                              "right",
                            fontWeight:
                              "700",
                          }}
                        >
                          {formatPrice(
                            item.subtotal
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
                        padding: "25px",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      No hay refacciones en
                      esta cotización.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ============================= */}
          {/* TOTALES */}
          {/* ============================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              marginTop: "26px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "330px",
                border:
                  "1px solid #dbe3ec",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom: "12px",
                }}
              >
                <span>Subtotal</span>

                <strong>
                  {formatPrice(
                    cotizacion.subtotal
                  )}
                </strong>
              </div>

              <div
                style={{
                  height: "1px",
                  background:
                    "#e2e8f0",
                  margin: "14px 0",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: "21px",
                  color: "#123f73",
                }}
              >
                <strong>TOTAL</strong>

                <strong>
                  {formatPrice(
                    cotizacion.total
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* ============================= */}
          {/* OBSERVACIONES */}
          {/* ============================= */}

          {cotizacion.observaciones && (
            <section
              style={{
                marginTop: "30px",
                background: "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#123f73",
                }}
              >
                Observaciones
              </h3>

              <div
                style={{
                  color: "#475569",
                  lineHeight: "1.6",
                }}
              >
                {cotizacion.observaciones}
              </div>
            </section>
          )}

          {/* ============================= */}
          {/* CONDICIONES */}
          {/* ============================= */}

          <section
            style={{
              marginTop: "34px",
              borderTop:
                "1px solid #e2e8f0",
              paddingTop: "24px",
            }}
          >
            <h3
              style={{
                color: "#123f73",
              }}
            >
              Condiciones
            </h3>

            <ul
              style={{
                lineHeight: "1.8",
                color: "#475569",
                paddingLeft: "22px",
              }}
            >
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
                La cotización no constituye
                una reserva de inventario.
              </li>
            </ul>
          </section>

          {/* ============================= */}
          {/* FIRMA */}
          {/* ============================= */}

          <div
            style={{
              marginTop: "55px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "60px",
            }}
          >
            <div>
              <div
                style={{
                  borderTop:
                    "1px solid #334155",
                  paddingTop: "8px",
                  textAlign: "center",
                }}
              >
                Cliente
              </div>
            </div>

            <div>
              <div
                style={{
                  borderTop:
                    "1px solid #334155",
                  paddingTop: "8px",
                  textAlign: "center",
                }}
              >
                Asesor de refacciones
              </div>
            </div>
          </div>

          {/* ============================= */}
          {/* BOTONES */}
          {/* ============================= */}

          <div
            className="cotizacion-actions"
            style={{
              marginTop: "40px",
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={onCerrar}
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

export default Cotizacion;