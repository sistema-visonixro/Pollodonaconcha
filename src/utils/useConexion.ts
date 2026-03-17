/**
 * Hook personalizado para detectar el estado de conexión a internet
 * Usa tanto navigator.onLine como verificación real a Supabase
 */

import { useState, useEffect, useRef } from "react";

// Variable global para cachear el estado de conexión real
let ultimaVerificacionReal = {
  timestamp: 0,
  conectado: true,
};

const CACHE_DURATION = 3000; // 3 segundos de cache

/**
 * Verifica conexión real haciendo ping al endpoint de Supabase de la app
 */
async function verificarConexionRealConTimeout(): Promise<boolean> {
  // Si no hay navigator.onLine, definitivamente sin internet
  if (!navigator.onLine) {
    console.log("❌ navigator.onLine = false");
    return false;
  }

  // Usar cache reciente para evitar checks excesivos
  const ahora = Date.now();
  if (ahora - ultimaVerificacionReal.timestamp < CACHE_DURATION) {
    return ultimaVerificacionReal.conectado;
  }

  try {
    const supabaseUrl =
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      "https://qxrdbsgktnyhigduhzcw.supabase.co";

    // Timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Ping al endpoint de Supabase (no-cors para evitar problemas de CORS)
    await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    ultimaVerificacionReal = { timestamp: ahora, conectado: true };
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // AbortError = timeout real; otros errores pueden ser CORS (conexión existe)
    if (errorMsg.includes("abort") || errorMsg.includes("Abort")) {
      ultimaVerificacionReal = { timestamp: ahora, conectado: false };
      return false;
    }
    // Para errores de red distintos al abort, confiar en navigator.onLine
    const resultado = navigator.onLine;
    ultimaVerificacionReal = { timestamp: ahora, conectado: resultado };
    return resultado;
  }
}

export function useConexion() {
  const [conectado, setConectado] = useState<boolean>(navigator.onLine);
  const [intentandoReconectar, setIntentandoReconectar] =
    useState<boolean>(false);
  const verificacionIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Verificar conexión real inicialmente
    verificarConexionRealConTimeout().then(setConectado);

    function manejarOnline() {
      console.log("📡 Navigator detectó conexión, verificando...");
      // Verificar conexión real antes de confirmar
      verificarConexionRealConTimeout().then((real) => {
        if (real) {
          console.log("✓ Conexión real confirmada");
          setConectado(true);
          setIntentandoReconectar(false);
        } else {
          console.warn("⚠ Navigator.onLine true pero sin acceso real");
          setConectado(false);
        }
      });
    }

    function manejarOffline() {
      console.warn("⚠ Conexión perdida (navigator.onLine)");
      setConectado(false);
      setIntentandoReconectar(true);
    }

    window.addEventListener("online", manejarOnline);
    window.addEventListener("offline", manejarOffline);

    // Verificar conexión real cada 5 segundos
    verificacionIntervalRef.current = setInterval(() => {
      verificarConexionRealConTimeout().then((real) => {
        if (real !== conectado) {
          console.log(
            `🔄 Estado de conexión cambió: ${real ? "CONECTADO" : "DESCONECTADO"}`,
          );
          setConectado(real);
          setIntentandoReconectar(!real);
        }
      });
    }, 5000);

    return () => {
      window.removeEventListener("online", manejarOnline);
      window.removeEventListener("offline", manejarOffline);
      if (verificacionIntervalRef.current) {
        clearInterval(verificacionIntervalRef.current);
      }
    };
  }, [conectado]);

  return { conectado, intentandoReconectar };
}

/**
 * Verifica si hay conexión a internet (función standalone)
 * MEJORADO: Ya no solo verifica navigator.onLine, también hace check real
 */
export async function estaConectadoReal(): Promise<boolean> {
  return await verificarConexionRealConTimeout();
}

/**
 * Verifica conexión rápidamente (solo navigator.onLine)
 * Usar solo cuando no importa la precisión
 */
export function verificarConexion(): boolean {
  return navigator.onLine;
}

/**
 * Intenta hacer un ping a Supabase para verificar conexión real
 */
export async function verificarConexionReal(
  supabaseUrl: string,
): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(supabaseUrl, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}
