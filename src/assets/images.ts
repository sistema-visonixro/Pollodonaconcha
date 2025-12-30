/**
 * Configuración centralizada de imágenes y assets de la aplicación
 * Todas las referencias a imágenes deben usar estas constantes
 */

// Imagen de fondo principal
export const BACKGROUND_IMAGE = "https://i.imgur.com/TsxgzAi.png";

// Logo principal de la aplicación
export const LOGO_IMAGE = "/logo.png";

// Favicon e íconos
export const FAVICON_32 = "/favicon-32.png";
export const FAVICON_ICO = "/favicon.ico";
export const ICON_192 = "/icon-192.png";
export const ICON_512 = "/icon-512.png";
export const LOGO_SVG = "/logo.svg";

// Función helper para obtener la URL del fondo como CSS
export const getBackgroundStyle = () => 
  `url(${BACKGROUND_IMAGE}) center/cover no-repeat`;

// Función helper para obtener el logo con fallback
export const getLogoWithFallback = () => ({
  primary: LOGO_IMAGE,
  fallback: LOGO_SVG,
});
