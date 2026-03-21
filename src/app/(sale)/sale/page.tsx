"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SessionItem = {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  qty: number;
  unitPriceRef: number;
  lineTotal: number;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  priceRef: number;
};

type OpenSession = {
  id: string;
  status: string;
  openedAt: string;
  items: SessionItem[];
};

export default function SalePage() {
  const [session, setSession] = useState<OpenSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const addInFlightRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TRANSFERENCIA" | "QR">(
    "EFECTIVO"
  );
  const [paymentTotal, setPaymentTotal] = useState("");

  const loadCurrent = useCallback(async () => {
    const res = await fetch("/api/v1/recess-sessions?current=1");
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { session: OpenSession | null };
    setSession(data.session);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/v1/products?status=ACTIVO&limit=200");
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { items: Product[] };
    setProducts(data.items);
    setSelectedProductId((prev) => {
      if (prev && data.items.some((p) => p.id === prev)) return prev;
      const firstNoBarcode = data.items.find((p) => !p.barcode);
      return firstNoBarcode?.id ?? data.items[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadCurrent(), loadProducts()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [loadCurrent, loadProducts]);

  async function openRecess() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/recess-sessions", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.sessionId) {
        await loadCurrent();
        setError(String(data.error ?? "Ya hay un recreo abierto"));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "No se pudo abrir");
      await loadCurrent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function addItem(byBarcode: boolean) {
    if (!session) return;
    if (addInFlightRef.current) return;
    addInFlightRef.current = true;
    setBusy(true);
    setError("");
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    try {
      const body = byBarcode
        ? { barcode: barcode.trim(), qty, idempotencyKey }
        : { productId: selectedProductId, qty, idempotencyKey };
      const res = await fetch(`/api/v1/recess-sessions/${session.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al agregar");
      setBarcode("");
      setQty(1);
      await loadCurrent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      addInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function closeRecess() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const body: { paymentMethod: string; paymentTotalAmount?: number } = {
        paymentMethod
      };
      const pt = paymentTotal.trim();
      if (pt !== "") {
        const n = Number(pt);
        if (!Number.isNaN(n) && n >= 0) body.paymentTotalAmount = n;
      }
      const res = await fetch(`/api/v1/recess-sessions/${session.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al cerrar");
      setSession(null);
      setPaymentTotal("");
      await loadCurrent();
      alert(
        `Recreo cerrado. Total venta: $${Number(data.totalAmount).toFixed(2)}` +
          (data.paymentTotalAmount != null
            ? ` | Cobro informado: $${Number(data.paymentTotalAmount).toFixed(2)}`
            : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const subtotal =
    session?.items.reduce((s, i) => s + i.lineTotal, 0) ?? 0;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
      <h1>Modo venta (recreo)</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        Un solo recreo abierto a la vez. Agregá ítems por código de barras o selección rápida.
      </p>
      {error && (
        <p style={{ color: "#c00", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      <p className="no-print">
        <a href="/api/v1/auth/logout" style={{ color: "#333" }}>
          Cerrar sesión
        </a>
      </p>

      {loading ? (
        <p>Cargando…</p>
      ) : !session ? (
        <section style={{ marginTop: 24 }}>
          <p>No hay recreo abierto.</p>
          <button
            type="button"
            disabled={busy}
            onClick={openRecess}
            style={{ padding: "12px 20px", fontSize: 16, cursor: busy ? "wait" : "pointer" }}
          >
            Abrir recreo
          </button>
        </section>
      ) : (
        <section style={{ marginTop: 16 }}>
          <p style={{ fontSize: 14 }}>
            <strong>Recreo abierto</strong> desde {new Date(session.openedAt).toLocaleString()} · ID:{" "}
            <code>{session.id.slice(0, 8)}…</code>
          </p>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginTop: 16
            }}
          >
            <h2 style={{ marginTop: 0 }}>Escanear / código</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Código de barras</label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(true))}
                  placeholder="Escanear…"
                  style={{ padding: 8, minWidth: 200 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 1)}
                  style={{ padding: 8, width: 72 }}
                />
              </div>
              <button type="button" disabled={busy || !barcode.trim()} onClick={() => addItem(true)}>
                Agregar
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginTop: 16
            }}
          >
            <h2 style={{ marginTop: 0 }}>Sin código (rápido)</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ padding: 8, minWidth: 220 }}
              >
                {products
                  .filter((p) => !p.barcode)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.priceRef.toFixed(2)})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={busy || !selectedProductId}
                onClick={() => addItem(false)}
              >
                Agregar
              </button>
            </div>
            {products.filter((p) => !p.barcode).length === 0 && (
              <p style={{ fontSize: 13, color: "#666" }}>
                No hay productos sin código. Creá algunos en Admin → Productos.
              </p>
            )}
          </div>

          <h2 style={{ marginTop: 24 }}>Ticket del recreo</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ccc" }}>
                  Producto
                </th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ccc" }}>Qty</th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ccc" }}>
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {session.items.map((i) => (
                <tr key={i.id}>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{i.productName}</td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    {i.qty}
                  </td>
                  <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                    ${i.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ textAlign: "right", fontSize: 18, marginTop: 8 }}>
            <strong>Total: ${subtotal.toFixed(2)}</strong>
          </p>

          <div
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 16,
              marginTop: 24
            }}
          >
            <h2 style={{ marginTop: 0 }}>Cerrar recreo</h2>
            <p style={{ fontSize: 13, color: "#555" }}>
              Cobro informativo (no integra medios de pago).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Medio</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                style={{ padding: 8 }}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="QR">QR</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                Monto cobrado (opcional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paymentTotal}
                onChange={(e) => setPaymentTotal(e.target.value)}
                placeholder={subtotal.toFixed(2)}
                style={{ padding: 8, width: 160 }}
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={closeRecess}
              style={{
                padding: "12px 20px",
                fontSize: 16,
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: busy ? "wait" : "pointer"
              }}
            >
              Cerrar recreo y generar resumen
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
