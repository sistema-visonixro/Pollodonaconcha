/**
 * InventarioMovilView.tsx
 * Vista optimizada para móviles del módulo de movimientos de inventario.
 * Destinada a usuarios con rol "inventario" que acceden desde un teléfono.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "./supabaseClient";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface InventarioMovilViewProps {
  onLogout: () => void;
}

interface Insumo {
  id: string;
  nombre: string;
  unidad: string;
  categoria?: string;
  stock_actual?: number;
  costo_unitario?: number;
}

interface Producto {
  id: string;
  nombre: string;
  tipo: string;
}

interface MovimientoInventario {
  id: string;
  item_tipo?: string;
  tipo: string;
  referencia_tipo?: string | null;
  referencia_id?: string | null;
  cantidad: number;
  costo_unitario?: number;
  nota?: string | null;
  cajero?: string | null;
  created_at: string;
  insumos?: { nombre: string } | null;
  productos?: { nombre: string } | null;
}

type MovementFormState = {
  itemType: string;
  itemId: string;
  tipoMovimiento: "entrada" | "salida" | "ajuste_positivo" | "ajuste_negativo";
  cantidad: string;
  costoUnitario: string;
  referenciaTipo: string;
  referenciaId: string;
  nota: string;
};

const initialForm: MovementFormState = {
  itemType: "insumo",
  itemId: "",
  tipoMovimiento: "entrada",
  cantidad: "",
  costoUnitario: "",
  referenciaTipo: "manual",
  referenciaId: "",
  nota: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUser() {
  try {
    const s = localStorage.getItem("usuario");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function num(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const dateTimeFmt = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "short",
  timeStyle: "short",
});

const TIPO_LABELS: Record<string, string> = {
  entrada: "📥 Entrada",
  salida: "📤 Salida",
  ajuste_positivo: "➕ Ajuste +",
  ajuste_negativo: "➖ Ajuste −",
  venta: "🛒 Venta",
  produccion: "🏭 Producción",
};

const TIPO_COLORS: Record<string, string> = {
  entrada: "#d1fae5",
  salida: "#fee2e2",
  ajuste_positivo: "#dbeafe",
  ajuste_negativo: "#fef3c7",
  venta: "#f3e8ff",
  produccion: "#ffedd5",
};

// ─── Componente ──────────────────────────────────────────────────────────────

export default function InventarioMovilView({
  onLogout,
}: InventarioMovilViewProps) {
  const usuario = getUser();

  // datos
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);

  // ui
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // formulario
  const [form, setForm] = useState<MovementFormState>(initialForm);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newInsumoOpen, setNewInsumoOpen] = useState(false);
  const [creatingInsumo, setCreatingInsumo] = useState(false);
  const [newInsumoForm, setNewInsumoForm] = useState({
    nombre: "",
    unidad: "unidad",
    categoria: "general",
    costo_unitario: "",
  });

  // ── Cargar datos ──────────────────────────────────────────────────────────

  async function loadData() {
    setLoading(true);
    try {
      const [insRes, prodRes, movRes] = await Promise.all([
        supabase
          .from("insumos")
          .select("id, nombre, unidad, categoria, stock_actual, costo_unitario")
          .order("nombre"),
        supabase.from("productos").select("id, nombre, tipo").order("nombre"),
        supabase
          .from("movimientos_inventario")
          .select(
            "id, item_tipo, tipo, referencia_tipo, referencia_id, cantidad, costo_unitario, nota, cajero, created_at, insumos(nombre), productos(nombre)",
          )
          .order("created_at", { ascending: false })
          .limit(80),
      ]);
      setInsumos((insRes.data || []) as Insumo[]);
      setProductos((prodRes.data || []) as Producto[]);
      const rows = (movRes.data || []).map((r: any) => ({
        ...r,
        cantidad: num(r.cantidad),
        costo_unitario: num(r.costo_unitario),
        insumos: Array.isArray(r.insumos) ? r.insumos[0] || null : r.insumos,
        productos: Array.isArray(r.productos)
          ? r.productos[0] || null
          : r.productos,
      })) as MovimientoInventario[];
      setMovimientos(rows);
    } catch (e: any) {
      setError(e?.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Memos ─────────────────────────────────────────────────────────────────

  const productTipos = useMemo(
    () =>
      Array.from(
        new Set(
          productos.map((p) => p.tipo).filter((t) => t && t !== "comida"),
        ),
      ).sort(),
    [productos],
  );

  const inventoryItems = useMemo(() => {
    if (form.itemType === "insumo") return insumos;
    return productos.filter((p) => p.tipo === form.itemType);
  }, [insumos, productos, form.itemType]);

  const insumosFiltrados = useMemo(() => {
    if (form.itemType !== "insumo") return [];
    const q = search.trim().toLowerCase();
    if (!q) return insumos;
    return insumos.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        (i.categoria || "").toLowerCase().includes(q),
    );
  }, [insumos, form.itemType, search]);

  // ── Crear insumo nuevo ───────────────────────────────────────────────────

  async function handleCreateInsumo() {
    const nombre = newInsumoForm.nombre.trim();
    if (!nombre) return;
    setCreatingInsumo(true);
    setError("");
    try {
      const { data, error: insertErr } = await supabase
        .from("insumos")
        .insert({
          nombre,
          unidad: newInsumoForm.unidad.trim() || "unidad",
          categoria: newInsumoForm.categoria.trim() || "general",
          costo_unitario: num(newInsumoForm.costo_unitario),
          stock_actual: 0,
          stock_minimo: 0,
          activo: true,
        })
        .select("id, nombre, unidad, categoria, stock_actual, costo_unitario")
        .single();
      if (insertErr) throw insertErr;
      if (data) {
        setInsumos((prev) => [...prev, data as Insumo]);
        setSearch(data.nombre);
        setForm((prev) => ({ ...prev, itemId: data.id }));
      }
      setNewInsumoOpen(false);
      setNewInsumoForm({
        nombre: "",
        unidad: "unidad",
        categoria: "general",
        costo_unitario: "",
      });
      setMessage(`Insumo "${nombre}" creado.`);
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el insumo.");
    } finally {
      setCreatingInsumo(false);
    }
  }

  // ── Registrar movimiento ─────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const cantidad = num(form.cantidad);
      const costoUnitario = num(form.costoUnitario);
      if (!form.itemId) throw new Error("Selecciona un ítem.");
      if (cantidad <= 0) throw new Error("La cantidad debe ser mayor a 0.");

      const { error: rpcErr } = await supabase.rpc(
        "registrar_movimiento_inventario",
        {
          p_item_tipo: form.itemType === "insumo" ? "insumo" : "producto",
          p_item_id: form.itemId,
          p_tipo_movimiento: form.tipoMovimiento,
          p_cantidad: cantidad,
          p_costo_unitario: costoUnitario,
          p_referencia_tipo: form.referenciaTipo || "manual",
          p_referencia_id: form.referenciaId || null,
          p_nota: form.nota || null,
          p_cajero: usuario?.nombre || "Inventario",
          p_cajero_id: String(usuario?.id || ""),
          p_modo_estricto: true,
        },
      );
      if (rpcErr) throw rpcErr;

      setForm(initialForm);
      setSearch("");
      setNewInsumoOpen(false);
      setModalOpen(false);
      setMessage("✅ Movimiento registrado.");
      await loadData();
    } catch (e: any) {
      setError(e?.message || "No se pudo registrar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "'Segoe UI', sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)",
          color: "white",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>📦 Inventario</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {usuario?.nombre || "Usuario"}
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 10,
            color: "white",
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Salir
        </button>
      </div>

      <div style={{ padding: "16px 14px 0" }}>
        {/* ── Mensajes ── */}
        {message && (
          <div
            style={{
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 12,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* ── Título sección + botón ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Movimientos recientes
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Últimos 80 registros
            </div>
          </div>
          <button
            onClick={() => {
              setForm(initialForm);
              setSearch("");
              setNewInsumoOpen(false);
              setError("");
              setMessage("");
              setModalOpen(true);
            }}
            style={{
              background: "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(29,78,216,0.35)",
            }}
          >
            + Registrar
          </button>
        </div>

        {/* ── Lista de movimientos ── */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#64748b",
              fontSize: 15,
            }}
          >
            Cargando…
          </div>
        ) : movimientos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "#64748b",
              fontSize: 14,
            }}
          >
            No hay movimientos registrados aún.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {movimientos.map((m) => {
              const nombre = m.insumos?.nombre || m.productos?.nombre || "—";
              const tipoLabel = TIPO_LABELS[m.tipo] || m.tipo;
              const bgColor = TIPO_COLORS[m.tipo] || "#f1f5f9";
              return (
                <div
                  key={m.id}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    padding: "12px 16px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    borderLeft: `4px solid ${TIPO_COLORS[m.tipo] ? "#3b82f6" : "#94a3b8"}`,
                  }}
                >
                  {/* fila 1: tipo + cantidad */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        background: bgColor,
                        borderRadius: 20,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {tipoLabel}
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#0f172a",
                      }}
                    >
                      {m.item_tipo === "insumo"
                        ? m.cantidad.toFixed(3)
                        : m.cantidad.toFixed(2)}
                    </span>
                  </div>
                  {/* fila 2: nombre del item */}
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#1e293b",
                      marginBottom: 4,
                    }}
                  >
                    {nombre}
                  </div>
                  {/* fila 3: cajero + fecha */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    <span>👤 {m.cajero || "—"}</span>
                    <span>{dateTimeFmt.format(new Date(m.created_at))}</span>
                  </div>
                  {/* fila 4: nota o referencia si existe */}
                  {(m.nota || m.referencia_tipo) && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#475569",
                        background: "#f8fafc",
                        borderRadius: 6,
                        padding: "4px 8px",
                      }}
                    >
                      {m.referencia_tipo && (
                        <span>🔖 {m.referencia_tipo} </span>
                      )}
                      {m.referencia_id && (
                        <span style={{ color: "#94a3b8" }}>
                          #{m.referencia_id}
                        </span>
                      )}
                      {m.nota && <span> — {m.nota}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Registrar movimiento (RESPONSIVO) ──────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            zIndex: 500,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "0 0 32px",
            }}
          >
            {/* handle bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "12px 0 4px",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 5,
                  background: "#e2e8f0",
                  borderRadius: 99,
                }}
              />
            </div>

            {/* título */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 20px 16px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>
                Registrar movimiento
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 99,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "16px 20px 0" }}>
              {/* mensajes inline */}
              {error && (
                <div
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              {/* ─ Tipo de item ─ */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Tipo de ítem</label>
                <select
                  style={inputStyle}
                  value={form.itemType}
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      itemType: e.target.value,
                      itemId: "",
                    }));
                    setSearch("");
                    setNewInsumoOpen(false);
                  }}
                >
                  <option value="insumo">Insumo</option>
                  {productTipos.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* ─ Item (insumo con búsqueda / producto con select) ─ */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Ítem</label>
                {form.itemType === "insumo" ? (
                  <div>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Buscar insumo…"
                      value={search}
                      autoComplete="off"
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setDropdownOpen(false), 180)
                      }
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setForm((p) => ({ ...p, itemId: "" }));
                        setDropdownOpen(true);
                      }}
                    />
                    {/* dropdown */}
                    {dropdownOpen && (
                      <div
                        style={{
                          background: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
                          marginTop: 2,
                        }}
                      >
                        {insumosFiltrados.length === 0 ? (
                          <div
                            style={{
                              padding: "10px 14px",
                              color: "#94a3b8",
                              fontSize: 13,
                            }}
                          >
                            Sin coincidencias
                          </div>
                        ) : (
                          insumosFiltrados.map((ins) => (
                            <div
                              key={ins.id}
                              onMouseDown={() => {
                                setSearch(ins.nombre);
                                setForm((p) => ({ ...p, itemId: ins.id }));
                                setDropdownOpen(false);
                                setNewInsumoOpen(false);
                              }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                fontSize: 14,
                                background:
                                  form.itemId === ins.id
                                    ? "#eff6ff"
                                    : "transparent",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>
                                {ins.nombre}
                              </span>
                              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                                {ins.stock_actual !== undefined
                                  ? `${Number(ins.stock_actual).toFixed(1)} ${ins.unidad}`
                                  : ins.unidad}
                              </span>
                            </div>
                          ))
                        )}
                        {/* Opción crear nuevo */}
                        {search.trim() &&
                          !insumos.some(
                            (i) =>
                              i.nombre.toLowerCase() ===
                              search.trim().toLowerCase(),
                          ) && (
                            <div
                              onMouseDown={() => {
                                setNewInsumoForm((p) => ({
                                  ...p,
                                  nombre: search.trim(),
                                }));
                                setNewInsumoOpen(true);
                                setDropdownOpen(false);
                              }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                fontSize: 13,
                                color: "#1d4ed8",
                                fontWeight: 600,
                                borderTop: "1px solid #e2e8f0",
                                background: "#f0f9ff",
                              }}
                            >
                              ＋ Crear "{search.trim()}" como nuevo insumo
                            </div>
                          )}
                      </div>
                    )}
                    {form.itemId ? (
                      <div
                        style={{ fontSize: 12, color: "#16a34a", marginTop: 3 }}
                      >
                        ✓ seleccionado
                      </div>
                    ) : search.trim() ? (
                      <div
                        style={{ fontSize: 12, color: "#dc2626", marginTop: 3 }}
                      >
                        Selecciona un insumo de la lista
                      </div>
                    ) : null}

                    {/* Sub-form crear insumo */}
                    {newInsumoOpen && (
                      <div
                        style={{
                          marginTop: 10,
                          background: "#f0f9ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#1e40af",
                            marginBottom: 10,
                          }}
                        >
                          Nuevo insumo
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Nombre</label>
                            <input
                              style={inputStyle}
                              value={newInsumoForm.nombre}
                              onChange={(e) =>
                                setNewInsumoForm((p) => ({
                                  ...p,
                                  nombre: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Unidad</label>
                            <input
                              style={inputStyle}
                              placeholder="kg, lt…"
                              value={newInsumoForm.unidad}
                              onChange={(e) =>
                                setNewInsumoForm((p) => ({
                                  ...p,
                                  unidad: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Categoría</label>
                            <input
                              style={inputStyle}
                              placeholder="general…"
                              value={newInsumoForm.categoria}
                              onChange={(e) =>
                                setNewInsumoForm((p) => ({
                                  ...p,
                                  categoria: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Costo unitario</label>
                            <input
                              style={inputStyle}
                              type="number"
                              min="0"
                              step="0.01"
                              value={newInsumoForm.costo_unitario}
                              onChange={(e) =>
                                setNewInsumoForm((p) => ({
                                  ...p,
                                  costo_unitario: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={handleCreateInsumo}
                            disabled={
                              creatingInsumo || !newInsumoForm.nombre.trim()
                            }
                            style={{
                              ...btnPrimary,
                              fontSize: 13,
                              padding: "8px 14px",
                              opacity:
                                creatingInsumo || !newInsumoForm.nombre.trim()
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {creatingInsumo ? "Guardando…" : "Crear"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewInsumoOpen(false)}
                            style={{
                              ...btnSecondary,
                              fontSize: 13,
                              padding: "8px 14px",
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    style={inputStyle}
                    value={form.itemId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, itemId: e.target.value }))
                    }
                  >
                    <option value="">Selecciona…</option>
                    {inventoryItems.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* ─ Tipo de movimiento ─ */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Tipo de movimiento</label>
                <select
                  style={inputStyle}
                  value={form.tipoMovimiento}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tipoMovimiento: e.target
                        .value as MovementFormState["tipoMovimiento"],
                    }))
                  }
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste_positivo">Ajuste positivo</option>
                  <option value="ajuste_negativo">Ajuste negativo</option>
                </select>
              </div>

              {/* ─ Cantidad + Costo (2 columnas) ─ */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Cantidad</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0"
                    value={form.cantidad}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cantidad: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Costo unitario</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.costoUnitario}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, costoUnitario: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* ─ Referencia + Doc (2 columnas) ─ */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Referencia</label>
                  <input
                    style={inputStyle}
                    placeholder="compra, ajuste…"
                    value={form.referenciaTipo}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        referenciaTipo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>ID documento</label>
                  <input
                    style={inputStyle}
                    placeholder="factura, orden…"
                    value={form.referenciaId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, referenciaId: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* ─ Nota ─ */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Nota (opcional)</label>
                <textarea
                  style={{
                    ...inputStyle,
                    height: 70,
                    resize: "vertical" as const,
                  }}
                  value={form.nota}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nota: e.target.value }))
                  }
                />
              </div>

              {/* ─ Botones ─ */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{ ...btnSecondary, flex: 1 }}
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    ...btnPrimary,
                    flex: 2,
                    opacity: submitting ? 0.7 : 1,
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Guardando…" : "Registrar movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos compartidos ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: 13,
  color: "#374151",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 15,
  background: "#f8fafc",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const btnPrimary: React.CSSProperties = {
  background: "#1d4ed8",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "#f1f5f9",
  color: "#374151",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
