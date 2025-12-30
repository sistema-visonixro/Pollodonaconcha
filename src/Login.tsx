import { useState } from "react";
import CajaOperadaView from "./CajaOperadaView";
import { supabase } from "./supabaseClient";
import { getLocalDayRange } from "./utils/fechas";
import { getBackgroundStyle } from "./assets/images";
import { useDatosNegocio } from "./useDatosNegocio";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { datos: datosNegocio } = useDatosNegocio();
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [cajaOperada, setCajaOperada] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const API_URL = `${
        import.meta.env.VITE_SUPABASE_URL
      }/rest/v1/usuarios?select=*`;
      const API_KEY = import.meta.env.VITE_SUPABASE_KEY || "";
      const res = await fetch(API_URL, {
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
        },
      });
      const users = await res.json();
      const user = users.find(
        (u: any) => u.codigo === codigo && u.clave === clave
      );
      if (user) {
        // Si es cajero, verificar si ya hizo apertura y cierre hoy
        if (user.rol === "cajero") {
          const { start, end } = getLocalDayRange();
          const caja = user.caja || user.caja_asignada || "";
          // Consultar aperturas y cierres usando rango local
          const aperturas = await supabase
            .from("cierres")
            .select("id")
            .eq("tipo_registro", "apertura")
            .eq("cajero", user.nombre)
            .eq("caja", caja)
            .gte("fecha", start)
            .lte("fecha", end);
          const cierres = await supabase
            .from("cierres")
            .select("id")
            .eq("tipo_registro", "cierre")
            .eq("cajero", user.nombre)
            .eq("caja", caja)
            .gte("fecha", start)
            .lte("fecha", end);
          if (
            aperturas.data &&
            aperturas.data.length > 0 &&
            cierres.data &&
            cierres.data.length > 0
          ) {
            setCajaOperada(true);
            setLoading(false);
            return;
          }
        }
        setShowSplash(true);
        setTimeout(() => {
          // Guardar id, usuario, rol y caja en localStorage
          localStorage.setItem(
            "usuario",
            JSON.stringify({
              id: user.id,
              usuario: user.nombre,
              nombre: user.nombre,
              email: user.email || "",
              rol: user.rol,
              caja: user.caja,
            })
          );
          onLogin(user);
          window.location.reload();
        }, 2000);
      } else {
        setError("Credenciales incorrectas");
      }
    } catch (err) {
      setError("Error de conexión");
    }
    setLoading(false);
  };

  if (cajaOperada) {
    return (
      <CajaOperadaView
        onCerrarSesion={() => {
          localStorage.removeItem("usuario");
          window.location.href = "/login";
        }}
      />
    );
  }
  
  // Usar logo del negocio como fondo, o fondo por defecto
  const backgroundStyle = datosNegocio.logo_url 
    ? `url(${datosNegocio.logo_url}) center/cover no-repeat`
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
      {showSplash ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: backgroundStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.8)",
              borderRadius: 24,
              padding: 48,
              boxShadow: "0 4px 24px #0002",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
            }}
          >
            {datosNegocio.logo_url ? (
              <img
                src={datosNegocio.logo_url}
                alt="Logo"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  marginBottom: 16,
                  boxShadow: "0 2px 8px #1976d233",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                  marginBottom: 16,
                  boxShadow: "0 2px 8px #1976d233",
                }}
              >
                🏪
              </div>
            )}
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#1976d2",
                marginBottom: 8,
              }}
            >
              Cargando...
            </div>
            <div
              style={{
                width: 60,
                height: 60,
                border: "6px solid #1976d2",
                borderTop: "6px solid #fff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: 20,
              boxShadow: "0 8px 32px #1976d244",
              padding: 40,
              minWidth: 320,
              maxWidth: 370,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              margin: "auto",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                textAlign: "center",
                marginBottom: 16,
                color: "#1976d2",
                fontWeight: 900,
                fontSize: 28,
                letterSpacing: 1,
              }}
            >
              Iniciar sesión
            </h2>
            <input
              type="text"
              placeholder="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              style={{
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
            />
            <input
              type="password"
              placeholder="Clave"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              style={{
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px",
                borderRadius: 8,
                background: "#1976d2",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s",
                marginTop: 8,
                textAlign: "center",
                boxShadow: "0 2px 8px #1976d222",
              }}
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
            {error && (
              <p style={{ color: "red", textAlign: "center" }}>{error}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
