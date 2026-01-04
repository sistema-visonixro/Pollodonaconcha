import { useEffect, useState } from "react";
import { BACKGROUND_IMAGE } from "./assets/images";

interface LandingProps {
  onFinish: () => void;
}

export default function Landing({ onFinish }: LandingProps) {
  // Version checker
  const [appVersion, setAppVersion] = useState<string>("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (canceled) return;
        setAppVersion(String(j.version || ""));
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      setCheckingUpdate(false);
      const d = e?.detail || {};
      if (d.updated) {
        setUpdateMessage(`Actualización disponible: ${d.availableVersion}`);
      } else {
        setUpdateMessage("El sistema está actualizado");
        setTimeout(() => setUpdateMessage(null), 3000);
      }
    };
    window.addEventListener(
      "app:check-update-result",
      handler as EventListener
    );
    return () =>
      window.removeEventListener(
        "app:check-update-result",
        handler as EventListener
      );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 700);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `url('${BACKGROUND_IMAGE}') no-repeat center center fixed`,
        backgroundSize: "cover",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.7)",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        {/* <h1 style={{ color: '#1976d2' }}>¡Bienvenido, {user.nombre}!</h1> */}
        <p>Accediendo al sistema...</p>
      </div>

      {/* Componente de versión y actualización */}
      {appVersion && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            left: 18,
            color: "#43a047",
            fontSize: 12,
            fontWeight: 700,
            zIndex: 12000,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span>Versión: {appVersion}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                setCheckingUpdate(true);
                setUpdateMessage(null);
                window.dispatchEvent(new CustomEvent("app:check-update"));
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#2e7d32",
                fontSize: 12,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
              title="Buscar actualización ahora"
            >
              Buscar actualización
            </button>
            {checkingUpdate && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(46,125,50,0.2)",
                  borderTop: "2px solid #2e7d32",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
          </div>
          {updateMessage && (
            <span
              style={{
                fontSize: 11,
                color: updateMessage.includes("disponible")
                  ? "#d32f2f"
                  : "#2e7d32",
                fontStyle: "italic",
              }}
            >
              {updateMessage}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
