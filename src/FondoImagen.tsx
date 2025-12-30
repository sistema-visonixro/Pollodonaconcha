import React from "react";
import { getBackgroundStyle } from "./assets/images";
import { useDatosNegocio } from "./useDatosNegocio";

export default function FondoImagen({
  children,
}: {
  children: React.ReactNode;
}) {
  const { datos } = useDatosNegocio();
  
  // Usar el logo del negocio como fondo, o usar el fondo por defecto
  const backgroundStyle = datos.logo_url 
    ? `url(${datos.logo_url}) center/cover no-repeat`
    : getBackgroundStyle();
  
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: backgroundStyle,
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  );
}
