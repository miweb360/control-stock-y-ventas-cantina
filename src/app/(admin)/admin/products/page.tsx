"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  priceRef: number;
  status: string;
  trackStock: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    priceRef: 0,
    trackStock: true,
    status: "ACTIVO" as "ACTIVO" | "INACTIVO"
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/products");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: Product[] };
      setProducts(data.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/v1/products/${editing.id}` : "/api/v1/products";
      const method = editing ? "PATCH" : "POST";
      const body =
        method === "POST"
          ? { name: form.name, barcode: form.barcode || null, priceRef: form.priceRef, trackStock: form.trackStock }
          : {
              name: form.name,
              barcode: form.barcode || null,
              priceRef: form.priceRef,
              trackStock: form.trackStock,
              status: form.status
            };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setModal(null);
      setEditing(null);
      setForm({ name: "", barcode: "", priceRef: 0, trackStock: true, status: "ACTIVO" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setForm({ name: "", barcode: "", priceRef: 0, trackStock: true, status: "ACTIVO" });
    setEditing(null);
    setModal("create");
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      barcode: p.barcode ?? "",
      priceRef: p.priceRef,
      trackStock: p.trackStock,
      status: (p.status as "ACTIVO" | "INACTIVO") ?? "ACTIVO"
    });
    setEditing(p);
    setModal("edit");
  }

  const styles = {
    main: { padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 900 } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, marginTop: 16 },
    th: { textAlign: "left" as const, padding: 8, borderBottom: "1px solid #ccc" },
    td: { padding: 8, borderBottom: "1px solid #eee" },
    btn: { padding: "6px 12px", cursor: "pointer" as const, marginRight: 8 },
    input: { padding: 6, width: "100%", boxSizing: "border-box" as const },
    formRow: { marginBottom: 12 },
    label: { display: "block" as const, marginBottom: 4, fontSize: 14 },
    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    modalInner: { background: "#fff", padding: 24, borderRadius: 8, width: "100%", maxWidth: 400 }
  };

  return (
    <main style={styles.main}>
      <nav className="no-print" style={{ marginBottom: 16 }}>
        <Link href="/admin" style={{ color: "#0066cc", marginRight: 16 }}>
          ← Admin
        </Link>
      </nav>
      <h1>Productos</h1>
      {error && (
        <p style={{ color: "#c00", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      <button type="button" style={styles.btn} onClick={openCreate}>
        + Nuevo producto
      </button>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Precio ref.</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th} />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={styles.td}>{p.name}</td>
                <td style={styles.td}>{p.barcode ?? "—"}</td>
                <td style={styles.td}>${p.priceRef.toFixed(2)}</td>
                <td style={styles.td}>{p.status}</td>
                <td style={styles.td}>
                  <button type="button" style={styles.btn} onClick={() => openEdit(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={styles.modal} onClick={() => !saving && setModal(null)} role="dialog">
          <div style={styles.modalInner} onClick={(e) => e.stopPropagation()}>
            <h2>{modal === "create" ? "Nuevo producto" : "Editar producto"}</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <label style={styles.label} htmlFor="name">
                  Nombre *
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label} htmlFor="barcode">
                  Código de barras
                </label>
                <input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label} htmlFor="priceRef">
                  Precio referencia *
                </label>
                <input
                  id="priceRef"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.priceRef || ""}
                  onChange={(e) => setForm((f) => ({ ...f, priceRef: Number(e.target.value) || 0 }))}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
                  />
                  {" "}Controlar stock
                </label>
              </div>
              {modal === "edit" && (
                <div style={styles.formRow}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as "ACTIVO" | "INACTIVO" }))
                    }
                    style={styles.input}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
              )}
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving} style={styles.btn}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" disabled={saving} style={styles.btn} onClick={() => setModal(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
