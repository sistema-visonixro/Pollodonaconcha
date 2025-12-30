import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface DatosNegocio {
  id?: number;
  nombre_negocio: string;
  rtn: string;
  direccion: string;
  celular: string;
  propietario: string;
  logo_url: string | null;
}

const defaultDatos: DatosNegocio = {
  nombre_negocio: "puntoventa",
  rtn: "",
  direccion: "",
  celular: "",
  propietario: "",
  logo_url: null,
};

let cachedDatos: DatosNegocio | null = null;

export function useDatosNegocio() {
  const [datos, setDatos] = useState<DatosNegocio>(cachedDatos || defaultDatos);
  const [loading, setLoading] = useState(!cachedDatos);

  useEffect(() => {
    if (cachedDatos) return;

    async function cargarDatos() {
      try {
        const { data, error } = await supabase
          .from("datos_negocio")
          .select("*")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error al cargar datos del negocio:", error);
          return;
        }

        if (data) {
          cachedDatos = data;
          setDatos(data);
          
          // Actualizar el título de la página
          document.title = data.nombre_negocio || "puntoventa";
          
          // Actualizar el favicon si hay logo
          if (data.logo_url) {
            updateFavicon(data.logo_url);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, []);

  return { datos, loading };
}

function updateFavicon(logoUrl: string) {
  // Actualizar favicon
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = logoUrl;

  // Actualizar apple-touch-icon si existe
  let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
  if (!appleLink) {
    appleLink = document.createElement("link");
    appleLink.rel = "apple-touch-icon";
    document.head.appendChild(appleLink);
  }
  appleLink.href = logoUrl;
}

// Función para invalidar el cache (llamar después de actualizar en DatosNegocioView)
export function invalidarCacheDatosNegocio() {
  cachedDatos = null;
}
