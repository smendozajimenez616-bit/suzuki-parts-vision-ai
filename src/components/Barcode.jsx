import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({ value }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const barcodeValue = String(
      value || ""
    ).trim();

    if (!barcodeValue) {
      svgRef.current.innerHTML = "";
      return;
    }

    try {
      JsBarcode(
        svgRef.current,
        barcodeValue,
        {
          format: "CODE128",
          lineColor: "#000000",
          background: "#ffffff",
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 16,
          textMargin: 8,
          margin: 12,
        }
      );
    } catch (error) {
      console.error(
        "No se pudo generar el código de barras:",
        error
      );

      svgRef.current.innerHTML = "";
    }
  }, [value]);

  return (
    <div className="barcode-wrapper">
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Código de barras ${
          value || ""
        }`}
      />
    </div>
  );
}