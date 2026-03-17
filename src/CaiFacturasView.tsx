import React, { useEffect, useState } from "react";
import PrecioDolarModal from "./PrecioDolarModal";

interface CaiFactura {
  id: string;
  cai: string;
  rango_desde: number;
  rango_hasta: number;
  caja_asignada: string;
  cajero_id: string;
  factura_actual?: string;
  creado_en?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  caja?: string;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/cai_facturas`;
const API_KEY = import.meta.env.VITE_SUPABASE_KEY || "";
const USUARIOS_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/rest/v1/usuarios?rol=eq.cajero`;

interface CaiFacturasViewProps {
  onBack?: () => void;
}

export default function CaiFacturasView({ onBack }: CaiFacturasViewProps) {
  const [facturas, setFacturas] = useState<CaiFactura[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<CaiFactura>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrecioModal, setShowPrecioModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [facturasRes, usuariosRes] = await Promise.all([
          fetch(API_URL + "?select=*", {
            headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
          }),
          fetch(USUARIOS_URL, {
            headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
          }),
        ]);

        const facturasData = await facturasRes.json();
        const usuariosData = await usuariosRes.json();

        setFacturas(facturasData);
        setUsuarios(usuariosData);
        setLoading(false);
      } catch {
        setError("Error al cargar datos");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Si hay cajero seleccionado, rellenar la caja automáticamente
    let cajaAuto = form.caja_asignada;
    if (form.cajero_id) {
      const cajero = usuarios.find((u) => u.id === form.cajero_id);
      if (cajero && cajero.caja) {
        cajaAuto = cajero.caja;
      }
    }
    const body = {
      ...form,
      caja_asignada: cajaAuto,
      rango_desde: Number(form.rango_desde),
      rango_hasta: Number(form.rango_hasta),
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`${API_URL}?id=eq.${editId}`, {
          method: "PATCH",
          headers: {
            apikey: API_KEY,
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(API_URL, {
          method: "POST",
          headers: {
            apikey: API_KEY,
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error("Error al guardar");

      setShowModal(false);
      setForm({});
      setEditId(null);

      const updated = await fetch(API_URL + "?select=*", {
        headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      });
      setFacturas(await updated.json());
      setLoading(false);
    } catch {
      setError("Error al guardar CAI");
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar registro de CAI permanentemente?")) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      });

      const updated = await fetch(API_URL + "?select=*", {
        headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      });
      setFacturas(await updated.json());
      setLoading(false);
    } catch {
      setError("Error al eliminar");
      setLoading(false);
    }
  };

  const handleEdit = (factura: CaiFactura) => {
    setEditId(factura.id);
    setForm(factura);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditId(null);
    setForm({});
    setShowModal(true);
  };

  const totalFacturas = facturas.length;
  const totalRangos = facturas.reduce(
    (sum, f) => sum + (f.rango_hasta - f.rango_desde + 1),
    0,
  );
  const cajerosActivos = [...new Set(facturas.map((f) => f.cajero_id))].length;

  return (
    <div
      className="cai-enterprise"
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        minWidth: "100vw",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        overflow: "auto",
      }}
    >
      <style>{`
        body, #root {
          width: 100vw !important;
          height: 100vh !important;
          min-width: 100vw !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: block !important;
          max-width: none !important;
          background: unset !important;
        }
        .cai-enterprise {
          min-height: 100vh;
          min-width: 100vw;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden;
        }
        :root {
          --primary: #ffffff;
          --secondary: #f8fafc;
          --accent: #3b82f6;
          --text-primary: #0f172a;
          --text-secondary: #64748b;
          --border: #e2e8f0;
          --shadow: 0 4px 20px rgba(0,0,0,0.06);
          --shadow-hover: 0 12px 32px rgba(0,0,0,0.12);
          --success: #10b981;
          --danger: #ef4444;
          --warning: #f59e0b;
          --info: #3b82f6;
        }

        .cai-enterprise {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: 1.5rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .btn-back {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-back:hover {
          background: rgba(255,255,255,0.15);
          border-color: var(--text-secondary);
        }

        .page-title {
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--info), #42a5f5);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(25,118,210,0.4);
        }

        .main-content {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: var(--shadow);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent);
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--shadow);
          margin-bottom: 2rem;
          border: 1px solid var(--border);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
        }

        .table th {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border);
        }

        .table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .table tr:hover {
          background: #f8fafc;
        }

        .btn-table {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-right: 8px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .btn-edit { 
          background: rgba(255,152,0,0.2); 
          color: #ff9800; 
        }

        .btn-edit:hover { background: rgba(255,152,0,0.3); }

        .btn-delete { 
          background: rgba(198,40,40,0.2); 
          color: #c62828; 
        }

        .btn-delete:hover { background: rgba(198,40,40,0.3); }

        .error {
          background: rgba(198,40,40,0.1);
          color: #c62828;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid var(--danger);
          margin-bottom: 1rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 2.5rem;
          min-width: 520px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }

        .modal-title {
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-close {
          background: #f1f5f9;
          border: none;
          color: #64748b;
          font-size: 1.5rem;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .form-input, .form-select {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px 16px;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .form-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        /* Cards para móvil (ocultas por defecto) */
        .cards-grid { display: none; }
        .cai-card { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgba(7,23,48,0.06); border: 1px solid rgba(25,118,210,0.06); cursor: pointer; }
        .cai-left { width:56px; height:56px; border-radius:10px; background:linear-gradient(180deg,#eaf4ff 0%,#fff 100%); display:flex; align-items:center; justify-content:center; color:#0b4f9a; font-weight:800; }
        .cai-body { flex:1; min-width:0; }
        .cai-title { font-weight:800; color:#0b4f9a; margin-bottom:6px; }
        .cai-meta { color:#6b7280; font-size:13px; }

        @media (max-width: 768px) {
          .header { padding: 1rem; flex-direction: column; gap: 1rem; }
          .main-content { padding: 1rem; }
          .form-grid { grid-template-columns: 1fr; }
          .modal { margin: 1rem; padding: 1.5rem; }
          /* Mostrar cards y ocultar tabla en móvil */
          .table { display: none; }
          .table-container { box-shadow: none; }
          .cards-grid { display: grid; gap: 12px; }
        }
      `}</style>

      <header className="header">
        <div className="header-left">
          {onBack && (
            <button className="btn-back" onClick={onBack}>
              ← Volver
            </button>
          )}
          <h1 className="page-title">🧾 CAI y Facturación</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-primary"
            onClick={() => setShowPrecioModal(true)}
            style={{ background: "#10b981", border: "none" }}
          >
            Precio del dólar
          </button>
          <button className="btn-primary" onClick={handleNew}>
            ➕ Nuevo CAI
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{totalFacturas}</div>
            <div className="stat-label">Registros CAI</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalRangos.toLocaleString()}</div>
            <div className="stat-label">Facturas Totales</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{cajerosActivos}</div>
            <div className="stat-label">Cajeros Activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{usuarios.length}</div>
            <div className="stat-label">Cajeros Totales</div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="error">⚠️ {error}</div>}

        {/* Tabla */}
        {loading ? (
          <div className="loading">⏳ Cargando registros CAI...</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>CAI</th>
                  <th>Rango Desde</th>
                  <th>Rango Hasta</th>
                  <th>Factura Actual</th>
                  <th>Caja</th>
                  <th>Cajero</th>
                  <th>Total Facturas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const cajero = usuarios.find((u) => u.id === f.cajero_id);
                  const totalFacturasRango = f.rango_hasta - f.rango_desde + 1;
                  return (
                    <tr key={f.id}>
                      <td>
                        <strong style={{ color: "var(--info)" }}>
                          {f.cai}
                        </strong>
                      </td>
                      <td>{f.rango_desde.toLocaleString()}</td>
                      <td>{f.rango_hasta.toLocaleString()}</td>
                      <td>
                        <strong
                          style={{ color: "#6366f1", fontSize: "1.1rem" }}
                        >
                          {f.factura_actual || "—"}
                        </strong>
                      </td>
                      <td style={{ color: "#4caf50" }}>{f.caja_asignada}</td>
                      <td style={{ color: "#ff9800" }}>
                        {cajero?.nombre || "Sin asignar"}
                      </td>
                      <td style={{ color: "var(--success)" }}>
                        {totalFacturasRango.toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn-table btn-edit"
                          onClick={() => handleEdit(f)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-table btn-delete"
                          onClick={() => handleDelete(f.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Cards view para móviles (oculto en escritorio) */}
            <div className="cards-grid" style={{ marginTop: 8 }}>
              {facturas.map((f) => {
                const cajero = usuarios.find((u) => u.id === f.cajero_id);
                const totalFacturasRango = f.rango_hasta - f.rango_desde + 1;
                return (
                  <div
                    key={f.id}
                    className="cai-card"
                    onClick={() => handleEdit(f)}
                  >
                    <div className="cai-left">CAI</div>
                    <div className="cai-body">
                      <div className="cai-title">
                        {f.cai}{" "}
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                            marginLeft: 8,
                          }}
                        >
                          #{f.id}
                        </span>
                      </div>
                      <div className="cai-meta">
                        Rango: {f.rango_desde.toLocaleString()} →{" "}
                        {f.rango_hasta.toLocaleString()} · Caja:{" "}
                        {f.caja_asignada}
                      </div>
                      <div className="cai-meta">
                        Cajero: {cajero?.nombre || "Sin asignar"} · Total
                        facturas: {totalFacturasRango.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 88 }}>
                      <div style={{ fontWeight: 900, color: "var(--info)" }}>
                        {totalFacturasRango.toLocaleString()}
                      </div>
                      <div
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {f.creado_en
                          ? f.creado_en.slice(0, 19).replace("T", " ")
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(30,41,59,0.45)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: "32px 32px 28px",
                maxWidth: 560,
                width: "92%",
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 24px 64px rgba(30,41,59,0.18), 0 0 0 1px rgba(100,116,139,0.1)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 3 }}>
                    {editId ? "Editando registro" : "Nuevo registro"}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
                    {editId ? "✏️ Editar CAI" : "➕ Nuevo CAI"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
                >
                  ✕
                </button>
              </div>

              {/* Separador */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #e2e8f0, transparent)", marginBottom: 22 }} />

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* CAI */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>📋 Código CAI *</label>
                  <input
                    type="text"
                    placeholder="Ingresa el código CAI completo"
                    value={form.cai || ""}
                    onChange={(e) => setForm((f) => ({ ...f, cai: e.target.value }))}
                    required
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#fff"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                  />
                </div>

                {/* Rango */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🔢 Rango Desde *</label>
                    <input
                      type="number"
                      placeholder="Ej: 1"
                      value={form.rango_desde || ""}
                      onChange={(e) => setForm((f) => ({ ...f, rango_desde: Number(e.target.value) }))}
                      required
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: "#f8fafc" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#fff"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🔢 Rango Hasta *</label>
                    <input
                      type="number"
                      placeholder="Ej: 1000"
                      value={form.rango_hasta || ""}
                      onChange={(e) => setForm((f) => ({ ...f, rango_hasta: Number(e.target.value) }))}
                      required
                      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: "#f8fafc" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#fff"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                    />
                  </div>
                </div>

                {/* Cajero */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>👤 Cajero Asignado *</label>
                  <select
                    value={form.cajero_id || ""}
                    onChange={(e) => setForm((f) => ({ ...f, cajero_id: e.target.value }))}
                    required
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: "#f8fafc", cursor: "pointer" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#fff"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                  >
                    <option value="">Selecciona un cajero...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Caja Asignada */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🏪 Caja Asignada *</label>
                  <input
                    type="text"
                    placeholder={form.cajero_id ? "Se autocompleta desde cajero" : "Ingresa nombre de caja"}
                    value={(() => {
                      if (form.cajero_id) {
                        const cajero = usuarios.find((u) => u.id === form.cajero_id);
                        return cajero && cajero.caja ? cajero.caja : form.caja_asignada || "";
                      }
                      return form.caja_asignada || "";
                    })()}
                    onChange={(e) => setForm((f) => ({ ...f, caja_asignada: e.target.value }))}
                    required
                    readOnly={!!form.cajero_id}
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: form.cajero_id ? "#94a3b8" : "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: form.cajero_id ? "#f1f5f9" : "#f8fafc", cursor: form.cajero_id ? "not-allowed" : "text" }}
                  />
                </div>

                {/* Factura Actual */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>📄 Factura Actual <span style={{ fontWeight: 400, color: "#94a3b8", textTransform: "none" }}>(opcional)</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Nº de factura actual — vacío = automático"
                    value={form.factura_actual || ""}
                    onChange={(e) => { const value = e.target.value; if (/^\d*$/.test(value)) setForm((f) => ({ ...f, factura_actual: value })); }}
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", outline: "none", transition: "border 150ms", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#fff"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                  />
                </div>

                {/* Separador */}
                <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                {/* Botones */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 150ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 10, background: loading ? "#c7d2fe" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", transition: "all 150ms", boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)" }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {loading ? "⏳ Guardando..." : editId ? "💾 Guardar Cambios" : "✅ Crear CAI"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <PrecioDolarModal
          open={showPrecioModal}
          onClose={() => setShowPrecioModal(false)}
        />
      </main>
    </div>
  );
}
