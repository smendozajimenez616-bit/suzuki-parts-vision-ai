// ==========================================
// PLANTILLA OFICIAL DE COTIZACIÓN
// SUZUKI TOLUCA
// ==========================================

const TARIFA_MANO_OBRA = 550;

// ==========================================
// FORMATO DE MONEDA
// ==========================================

function formatPrice(value) {
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

// ==========================================
// ESCAPAR HTML
// ==========================================

function escapeHtml(valor) {
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

// ==========================================
// FECHA
// ==========================================

function formatDateOnly(value) {
  let fecha;

  if (value) {
    fecha =
      new Date(value);
  } else {
    fecha =
      new Date();
  }

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    fecha =
      new Date();
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(fecha);
}

// ==========================================
// NÚMERO SEGURO
// ==========================================

function numeroSeguro(value) {
  const numero =
    Number(value);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

// ==========================================
// CONCEPTOS ADICIONALES
// ==========================================

function obtenerConceptosAdicionales(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return {
      total: 0,
      filas: [],
    };
  }

  let conceptos =
    valor;

  if (
    typeof valor === "string"
  ) {
    try {
      conceptos =
        JSON.parse(valor);
    } catch {
      const numero =
        numeroSeguro(valor);

      if (numero > 0) {
        return {
          total: numero,

          filas: [
            {
              descripcion:
                "Conceptos adicionales",

              importe:
                numero,
            },
          ],
        };
      }

      return {
        total: 0,
        filas: [],
      };
    }
  }

  if (
    typeof conceptos ===
      "number"
  ) {
    return {
      total:
        conceptos > 0
          ? conceptos
          : 0,

      filas:
        conceptos > 0
          ? [
              {
                descripcion:
                  "Conceptos adicionales",

                importe:
                  conceptos,
              },
            ]
          : [],
    };
  }

  if (
    !Array.isArray(
      conceptos
    )
  ) {
    conceptos =
      conceptos
        ? [conceptos]
        : [];
  }

  const filas =
    conceptos
      .map(
        (concepto) => {
          if (
            typeof concepto ===
              "number"
          ) {
            return {
              descripcion:
                "Concepto adicional",

              importe:
                numeroSeguro(
                  concepto
                ),
            };
          }

          if (
            typeof concepto ===
              "string"
          ) {
            const importe =
              numeroSeguro(
                concepto
              );

            return {
              descripcion:
                "Concepto adicional",

              importe,
            };
          }

          return {
            descripcion:
              String(
                concepto
                  ?.descripcion ||
                  concepto
                    ?.concepto ||
                  concepto
                    ?.nombre ||
                  "Concepto adicional"
              ).trim(),

            importe:
              numeroSeguro(
                concepto
                  ?.importe ??
                  concepto
                    ?.precio ??
                  concepto
                    ?.total ??
                  concepto
                    ?.monto ??
                  0
              ),
          };
        }
      )
      .filter(
        (concepto) =>
          concepto.importe > 0
      );

  const total =
    filas.reduce(
      (
        acumulado,
        concepto
      ) =>
        acumulado +
        concepto.importe,
      0
    );

  return {
    total,
    filas,
  };
}

// ==========================================
// NORMALIZAR COTIZACIÓN
// ==========================================

function normalizarCotizacion(
  cotizacion = {}
) {
  const cliente =
    cotizacion.cliente || {};

  const nombreCliente =
    cliente.nombre ||
    cotizacion.nombreCliente ||
    cotizacion.clienteNombre ||
    "—";

  const telefonoCliente =
    cliente.telefono ||
    cotizacion.telefonoCliente ||
    cotizacion.clienteTelefono ||
    "—";

  const modeloVehiculo =
    cotizacion.modeloVehiculo ||
    cotizacion.modelo ||
    "";

  const anioVehiculo =
    cotizacion.anioVehiculo ||
    cotizacion.anio ||
    "";

  const versionVehiculo =
    cotizacion.versionVehiculo ||
    cotizacion.version ||
    "";

  const vinVehiculo =
    cotizacion.vinVehiculo ||
    "";

  const operacionInstalacion =
    String(
      cotizacion
        .operacionInstalacion ||
        ""
    ).trim();

  const fuenteTiempo =
    String(
      cotizacion
        .fuenteTiempo ||
      cotizacion
        .fuenteTiempoInstalacion ||
        ""
    ).trim();

  const tiempoInstalacion =
    numeroSeguro(
      cotizacion
        .tiempoInstalacion
    );

  const tiempoValido =
    tiempoInstalacion > 0;

  const itemsOriginales =
    Array.isArray(
      cotizacion.items
    )
      ? cotizacion.items
      : [];

  const items =
    itemsOriginales.map(
      (item) => {
        const cantidad =
          Math.max(
            1,
            numeroSeguro(
              item.cantidad || 1
            )
          );

        const precioUnitario =
          numeroSeguro(
            item.precioUnitario ??
            item.precio ??
            0
          );

        const subtotalCalculado =
          cantidad *
          precioUnitario;

        const subtotal =
          numeroSeguro(
            item.subtotal
          ) > 0
            ? numeroSeguro(
                item.subtotal
              )
            : subtotalCalculado;

        return {
          numeroParte:
            item.numeroParte ||
            "",

          descripcion:
            item.descripcion ||
            "Refacción Suzuki",

          cantidad,

          precioUnitario,

          subtotal,
        };
      }
    );

  const subtotalItems =
    items.reduce(
      (
        acumulado,
        item
      ) =>
        acumulado +
        item.subtotal,
      0
    );

  const totalRefacciones =
    subtotalItems > 0
      ? subtotalItems
      : numeroSeguro(
          cotizacion.subtotal ??
          cotizacion.total ??
          0
        );

  const manoObra =
    tiempoValido
      ? tiempoInstalacion *
        TARIFA_MANO_OBRA
      : 0;

  const conceptos =
    obtenerConceptosAdicionales(
      cotizacion
        .conceptosAdicionales
    );

  const totalInstalado =
    totalRefacciones +
    manoObra +
    conceptos.total;

  return {
    folio:
      cotizacion.folio ||
      cotizacion
        .folioCotizacion ||
      "—",

    fecha:
      cotizacion.fecha,

    nombreCliente,

    telefonoCliente,

    modeloVehiculo,

    anioVehiculo,

    versionVehiculo,

    vinVehiculo,

    items,

    totalRefacciones,

    operacionInstalacion,

    tiempoInstalacion,

    tiempoValido,

    fuenteTiempo,

    manoObra,

    conceptos,

    totalInstalado,
  };
}

// ==========================================
// IMPRIMIR COTIZACIÓN OFICIAL
// ==========================================

export function imprimirCotizacionOficial(
  cotizacion = {}
) {
  if (!cotizacion) {
    return;
  }

  const datos =
    normalizarCotizacion(
      cotizacion
    );

  const fecha =
    formatDateOnly(
      datos.fecha
    );

  const filas =
    datos.items
      .map(
        (item) => `
          <tr>
            <td class="center">
              ${escapeHtml(
                item.cantidad
              )}
            </td>

            <td>
              ${escapeHtml(
                item.descripcion
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

  const filasConceptos =
    datos.conceptos.filas
      .map(
        (concepto) => `
          <div class="total-row">
            <span>
              ${escapeHtml(
                concepto.descripcion
              )}
            </span>

            <strong>
              ${escapeHtml(
                formatPrice(
                  concepto.importe
                )
              )}
            </strong>
          </div>
        `
      )
      .join("");

  const ventana =
    window.open(
      "",
      "_blank",
      "width=1100,height=850"
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

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />

      <title>
        Cotización ${escapeHtml(
          datos.folio
        )}
      </title>

      <style>

        * {
          box-sizing: border-box;
        }

        @page {
          size: A4;
          margin: 8mm 10mm 8mm;
        }

        body {
          margin: 0;
          font-family:
            Arial,
            Helvetica,
            sans-serif;

          color: #243247;
          background: #ffffff;
          font-size: 11px;
        }

        .sheet {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
        }

        .top {
          display: grid;

          grid-template-columns:
            1fr 255px;

          gap: 28px;

          align-items: start;

          padding:
            4px 0 14px;

          border-bottom:
            4px solid #174a86;
        }

        .suzuki-brand {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }

        .suzuki-logo {
          width: 235px;
          max-width: 100%;
          height: auto;

          display: block;

          object-fit:
            contain;
        }

        .company {
          color: #174a86;

          font-size: 18px;

          font-weight: 800;

          margin-top: 4px;
        }

        .dealer,
        .department {
          color: #64748b;
          line-height: 1.5;
        }

        .meta {
          border:
            1px solid #d8e0e9;

          border-radius:
            17px;

          padding:
            15px 17px;

          box-shadow:
            0 1px 3px
            rgba(
              15,
              23,
              42,
              0.04
            );
        }

        .meta-row {
          display: grid;

          grid-template-columns:
            72px 1fr;

          gap: 8px;

          margin:
            7px 0;

          align-items:
            baseline;
        }

        .meta-row strong {
          color: #1f2937;
        }

        .document-title {
          margin:
            12px 0 9px;

          color: #9aa0a6;

          font-size: 18px;

          font-weight: 900;

          letter-spacing:
            .4px;
        }

        .vehicle-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          column-gap:
            34px;

          row-gap: 0;

          margin-bottom:
            10px;
        }

        .field-line {
          display: grid;

          grid-template-columns:
            138px 1fr;

          gap: 8px;

          min-height:
            29px;

          align-items:
            center;

          border-bottom:
            1px solid #e5e7eb;
        }

        .field-line
        .field-label {
          color: #174a86;

          font-weight:
            800;
        }

        .field-line
        .field-value {
          font-weight:
            500;

          overflow-wrap:
            anywhere;
        }

        .section-title {
          display: flex;

          align-items:
            center;

          gap: 10px;

          color: #df0038;

          font-size:
            16px;

          font-weight:
            900;

          margin:
            14px 0 7px;

          text-transform:
            uppercase;
        }

        .section-mark {
          width: 8px;
          height: 31px;

          border-left:
            5px solid #df0038;

          border-radius:
            50%;
        }

        table {
          width: 100%;

          border-collapse:
            collapse;

          table-layout:
            fixed;
        }

        th,
        td {
          border:
            1px solid #d8dee8;

          padding:
            6px 7px;

          vertical-align:
            middle;
        }

        th {
          background:
            #f8fafc;

          color: #174a86;

          font-size:
            10.5px;

          font-weight:
            800;

          text-align:
            left;
        }

        .parts-table
        th:nth-child(1) {
          width: 8%;
        }

        .parts-table
        th:nth-child(2) {
          width: 34%;
        }

        .parts-table
        th:nth-child(3) {
          width: 21%;
        }

        .parts-table
        th:nth-child(4),
        .parts-table
        th:nth-child(5) {
          width: 18.5%;
        }

        .money {
          text-align:
            right;

          white-space:
            nowrap;
        }

        .center {
          text-align:
            center;
        }

        .labor-table
        th:nth-child(1) {
          width: 40%;
        }

        .labor-table
        th:nth-child(2) {
          width: 12%;

          text-align:
            center;
        }

        .labor-table
        th:nth-child(3),
        .labor-table
        th:nth-child(4) {
          width: 24%;

          text-align:
            right;
        }

        .installation-note {
          margin-top:
            7px;

          padding:
            8px 10px;

          border:
            1px solid #c9dcf4;

          background:
            #f3f8fe;

          border-radius:
            9px;

          color:
            #174a86;

          font-weight:
            700;
        }

        .totals {
          width: 410px;

          max-width:
            100%;

          margin:
            12px 0 0 auto;

          border:
            1px solid #d8dee8;

          border-radius:
            16px;

          overflow:
            hidden;
        }

        .total-row {
          display: flex;

          justify-content:
            space-between;

          gap: 20px;

          padding:
            9px 14px;

          border-bottom:
            1px solid #e5e7eb;

          font-size:
            12px;
        }

        .total-row:last-child {
          border-bottom:
            0;
        }

        .total-row strong {
          white-space:
            nowrap;
        }

        .grand-total {
          color:
            #174a86;

          font-size:
            15px;

          font-weight:
            900;

          background:
            #fbfdff;
        }

        .pending-total {
          color:
            #8a6116;

          background:
            #fffaf0;
        }

        .conditions {
          margin-top:
            14px;

          padding-top:
            9px;

          border-top:
            2px solid #df0038;

          page-break-inside:
            avoid;
        }

        .conditions h3 {
          color:
            #174a86;

          margin:
            0 0 5px;

          font-size:
            14px;
        }

        .conditions ul {
          margin: 0;

          padding-left:
            19px;

          color:
            #475569;

          line-height:
            1.35;
        }

        .signatures {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 70px;

          margin-top:
            26px;

          page-break-inside:
            avoid;

          break-inside:
            avoid;
        }

        .signature {
          border-top:
            1px solid #334155;

          text-align:
            center;

          padding-top:
            5px;

          color:
            #475569;
        }

        .footer-note {
          margin-top:
            10px;

          color:
            #64748b;

          font-size:
            10px;

          line-height:
            1.4;
        }

        @media print {

          body {
            -webkit-print-color-adjust:
              exact;

            print-color-adjust:
              exact;

            font-size:
              10.5px;
          }

          .sheet {
            max-width:
              none;
          }

          .top,
          .vehicle-grid,
          .parts-table,
          .labor-table,
          .installation-note,
          .totals,
          .conditions,
          .signatures,
          .footer-note {
            break-inside:
              avoid;

            page-break-inside:
              avoid;
          }

          .footer-note {
            margin-top:
              8px;
          }
        }

      </style>

    </head>

    <body>

      <main class="sheet">

        <header class="top">

          <div>

            <div class="suzuki-brand">

              <img
                src="${window.location.origin}/suzuki-logo.jpeg"
                alt="Suzuki By Your Side"
                class="suzuki-logo"
              />

            </div>

            <div class="company">
              Autos Japoneses de Toluca SA de CV
            </div>

            <div class="dealer">
              Suzuki Toluca
            </div>

            <div class="department">
              Departamento: Refacciones
            </div>

          </div>

          <div class="meta">

            <div class="meta-row">

              <strong>
                Fecha:
              </strong>

              <span>
                ${fecha}
              </span>

            </div>

            <div class="meta-row">

              <strong>
                Folio:
              </strong>

              <span>
                ${escapeHtml(
                  datos.folio
                )}
              </span>

            </div>

            <div class="meta-row">

              <strong>
                Vigencia:
              </strong>

              <span>
                15 días naturales
              </span>

            </div>

          </div>

        </header>

        <div class="document-title">
          COTIZACIÓN
        </div>

        <section class="vehicle-grid">

          <div class="field-line">

            <div class="field-label">
              Nombre del cliente:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.nombreCliente
              )}
            </div>

          </div>

          <div class="field-line">

            <div class="field-label">
              Teléfono:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.telefonoCliente
              )}
            </div>

          </div>

          <div class="field-line">

            <div class="field-label">
              Modelo Suzuki:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.modeloVehiculo ||
                "—"
              )}
            </div>

          </div>

          <div class="field-line">

            <div class="field-label">
              Año:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.anioVehiculo ||
                "—"
              )}
            </div>

          </div>

          <div class="field-line">

            <div class="field-label">
              VIN:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.vinVehiculo ||
                "No proporcionado"
              )}
            </div>

          </div>

          <div class="field-line">

            <div class="field-label">
              Versión / Motor:
            </div>

            <div class="field-value">
              ${escapeHtml(
                datos.versionVehiculo ||
                "—"
              )}
            </div>

          </div>

        </section>

        <div class="section-title">

          <span
            class="section-mark"
          ></span>

          <span>
            Refacciones
          </span>

        </div>

        <table class="parts-table">

          <thead>

            <tr>

              <th>
                Cantidad
              </th>

              <th>
                Descripción
              </th>

              <th>
                No. parte
              </th>

              <th class="money">
                Precio unitario
              </th>

              <th class="money">
                Precio total
              </th>

            </tr>

          </thead>

          <tbody>

            ${
              filas ||
              `
              <tr>
                <td
                  colspan="5"
                  class="center"
                >
                  Sin refacciones registradas
                </td>
              </tr>
              `
            }

          </tbody>

        </table>

        <div class="section-title">

          <span
            class="section-mark"
          ></span>

          <span>
            Mano de obra
          </span>

        </div>

        <table class="labor-table">

          <thead>

            <tr>

              <th>
                Descripción
              </th>

              <th>
                Hrs
              </th>

              <th>
                Tarifa
              </th>

              <th>
                Mano de obra
              </th>

            </tr>

          </thead>

          <tbody>

            <tr>

              <td>

                ${escapeHtml(
                  datos.operacionInstalacion ||
                  "Tiempo de instalación pendiente de validación por Servicio"
                )}

              </td>

              <td class="center">

                ${
                  datos.tiempoValido
                    ? escapeHtml(
                        datos
                          .tiempoInstalacion
                      )
                    : "—"
                }

              </td>

              <td class="money">

                ${escapeHtml(
                  formatPrice(
                    TARIFA_MANO_OBRA
                  )
                )} / h

              </td>

              <td class="money">

                ${
                  datos.tiempoValido
                    ? escapeHtml(
                        formatPrice(
                          datos.manoObra
                        )
                      )
                    : "Pendiente"
                }

              </td>

            </tr>

          </tbody>

        </table>

        <div class="installation-note">

          Tarifa especial de instalación para
          clientes de mostrador:
          $550 por hora, IVA incluido.

          ${
            datos.tiempoValido &&
            datos.fuenteTiempo
              ? `
                <br />
                Fuente del tiempo:
                ${escapeHtml(
                  datos.fuenteTiempo
                )}.
              `
              : ""
          }

          ${
            !datos.tiempoValido
              ? `
                <br />
                Tiempo de instalación pendiente de
                validación por Servicio.
              `
              : ""
          }

        </div>

        <div class="totals">

          <div class="total-row">

            <span>
              Total de refacciones
            </span>

            <strong>

              ${escapeHtml(
                formatPrice(
                  datos.totalRefacciones
                )
              )}

            </strong>

          </div>

          <div class="total-row">

            <span>
              Mano de obra
            </span>

            <strong>

              ${
                datos.tiempoValido
                  ? escapeHtml(
                      formatPrice(
                        datos.manoObra
                      )
                    )
                  : "Pendiente"
              }

            </strong>

          </div>

          ${filasConceptos}

          ${
            datos.tiempoValido
              ? `
                <div
                  class="total-row grand-total"
                >

                  <span>
                    TOTAL INSTALADO
                  </span>

                  <strong>

                    ${escapeHtml(
                      formatPrice(
                        datos.totalInstalado
                      )
                    )}

                  </strong>

                </div>
              `
              : `
                <div
                  class="total-row grand-total pending-total"
                >

                  <span>
                    TOTAL REFACCIONES
                  </span>

                  <strong>

                    ${escapeHtml(
                      formatPrice(
                        datos.totalRefacciones
                      )
                    )}

                  </strong>

                </div>

                <div
                  class="total-row pending-total"
                >

                  <span>
                    Total instalado
                  </span>

                  <strong>
                    Pendiente de validación
                  </strong>

                </div>
              `
          }

        </div>

        <section class="conditions">

          <h3>
            Condiciones
          </h3>

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
              La cotización no representa
              una reserva de inventario.
            </li>

            <li>
              El VIN es recomendado para
              validar compatibilidad, pero
              no es obligatorio para generar
              la cotización.
            </li>

          </ul>

        </section>

        <div class="signatures">

          <div class="signature">
            Cliente
          </div>

          <div class="signature">
            Asesor de refacciones
          </div>

        </div>

        <div class="footer-note">

          Cotización generada por
          Suzuki Parts Vision AI —
          Suzuki Toluca.

        </div>

      </main>

      <script>

        window.onload =
          function () {

            setTimeout(
              function () {
                window.print();
              },
              250
            );

          };

      </script>

    </body>

    </html>
  `);

  ventana.document.close();
}