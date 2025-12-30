/**
 * Configuración centralizada de imágenes y assets de la aplicación VENTA
 * Todas las referencias a imágenes deben usar estas constantes
 */

// Imagen de fondo principal
export const BACKGROUND_IMAGE = "https://i.imgur.com/TsxgzAi.png";

// Logo principal de la aplicación
export const LOGO_IMAGE = "/logo.png";

// Función helper para obtener la URL del fondo como CSS
export const getBackgroundStyle = () => 
  `url(${BACKGROUND_IMAGE}) center/cover no-repeat`;
