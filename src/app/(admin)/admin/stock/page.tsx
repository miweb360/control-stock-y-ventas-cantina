"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  priceRef: number;
  status: string;
  trackStock: boolean;
};

type StockItem = {
  productId: string;
  productName: string | null;
  stock: number;
};

type MovementItem = {
  id: string;
  productId: string;
  productName: string | null;
  type: string;
  qty: number;
  reason: string;
  createdAt: string;
};

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState<{
    type: "IN" | "ADJUST" | "EXPIRE";
    qty: number;
    reason: string;
  }>({ type: "IN", qty: 1, reason: "" });

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/v1/products?status=ACTIVO&limit=100");
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { items: Product[] };
    setProducts(data.items);
    setSelectedProductId((prev) => (prev ? prev : data.items[0]?.id ?? prev));
  }, []);

  const loadStock = useCallback(async () => {
    const res = await fetch("/api/v1/stock");
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { items: StockItem[] };
    setStockItems(data.items);
  }, []);

  const loadMovements = useCallback(async (productId?: string) => {
    const qp = new URLSearchParams();
    qp.set("limit", "50");
    if (productId) qp.set("productId", productId);
    const res = await fetch(`/api/v1/inventory-movements?${qp.toString()}`);
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { items: MovementItem[] };
    setMovements(data.items);
  }, []);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");
      try {
        await loadProducts();
        await loadStock();
        await loadMovements(undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [loadProducts, loadStock, loadMovements]);

  useEffect(() => {
    if (!selectedProductId) return;
    loadMovements(selectedProductId).catch(() => {});
  }, [selectedProductId, loadMovements]);

  const selectedStock = useMemo(() => {
    if (!selectedProductId) return null;
    return stockItems.find((s) => s.productId === selectedProductId)?.stock ?? null;
  }, [selectedProductId, stockItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedProductId) {
      setError("Selecciona un producto");
      return;
    }
    if (!form.reason.trim()) {
      setError("reason requerido");
      return;
    }

    // Convención del backend:
    // IN => qty como positivo (se convierte a +)
    // EXPIRE => qty como positivo (se convierte a -)
    // ADJUST => qty puede ser positivo o negativo (delta)
    const qty = Number.isFinite(form.qty) ? form.qty : 0;

    const payload = {
      productId: selectedProductId,
      type: form.type,
      qty,
      reason: form.reason.trim()
    };

    const res = await fetch("/api/v1/inventory-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Error al guardar movimiento");
      return;
    }

    setForm({ type: "IN", qty: 1, reason: "" });
    await loadStock();
    await loadMovements(selectedProductId);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1000 }}>
      <nav className="no-print" style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/admin" style={{ color: "#0066cc" }}>
          ← Admin
        </Link>
        <div>
          Stock seleccionado:{" "}
          <strong>{selectedStock === null ? "—" : selectedStock}</strong>
        </div>
      </nav>

      <h1 style={{ marginBottom: 8 }}>Stock / Movimientos</h1>
      {error && (
        <p style={{ color: "#c00", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <>
          <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Registrar movimiento</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Producto</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    style={{ width: "100%", padding: 8 }}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.barcode ? `(${p.barcode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                    style={{ width: "100%", padding: 8 }}
                  >
                    <option value="IN">IN (ingreso / reposición)</option>
                    <option value="ADJUST">ADJUST (delta + o -)</option>
                    <option value="EXPIRE">EXPIRE (baja por vencimiento)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Cantidad</label>
                  <input
                    type="number"
                    step={form.type === "ADJUST" ? "1" : "1"}
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 8 }}
                  />
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    {form.type === "IN" && "Se interpreta como +qty"}
                    {form.type === "EXPIRE" && "Se interpreta como -qty"}
                    {form.type === "ADJUST" && "Permite delta positivo o negativo"}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Razón</label>
                  <input
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Ej: reposición por semana / merma / ajuste manual"
                    style={{ width: "100%", padding: 8 }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                <button type="submit" style={{ padding: "10px 16px", cursor: "pointer" }}>
                  Guardar movimiento
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ type: "IN", qty: 1, reason: "" })}
                  style={{ padding: "10px 16px", cursor: "pointer" }}
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section style={{ marginTop: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Últimos movimientos</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Fecha</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Qty</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>Razón</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.type}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.qty}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.reason}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                      Sin movimientos para el producto seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}

