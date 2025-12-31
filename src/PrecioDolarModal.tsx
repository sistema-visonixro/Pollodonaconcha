import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PrecioDolarModal({ open, onClose }: Props) {
  const [valor, setValor] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("precio_dolar")
          .select("valor")
          .eq("id", "singleton")
          .limit(1)
          .single();
        if (error && error.code !== "22004") {
          // ignore not found
          setError(error.message);
        }
        if (data && typeof data.valor !== "undefined") {
          setValor(Number(data.valor));
        } else {
          setValor("");
        }
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const numeric = Number(valor) || 0;
      const { error } = await supabase.from("precio_dolar").upsert(
        {
          id: "singleton",
          valor: numeric,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          minWidth: 320,
          maxWidth: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Precio del dólar</h3>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", fontSize: 20 }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 8 }}>⚠️ {error}</div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Valor (en moneda local por 1 USD)
          </label>
          <input
            type="number"
            step="0.0001"
            value={valor === "" ? "" : String(valor)}
            onChange={(e) =>
              setValor(e.target.value === "" ? "" : Number(e.target.value))
            }
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "transparent",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "white",
            }}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
