"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SalesSummary = {
  period: { from: string; to: string; timezoneNote: string };
  closedSessionsCount: number;
  totalRevenue: number;
  sessions: Array<{
    id: string;
    openedAt: string;
    closedAt: string | null;
    totalAmount: number;
    paymentMethod: string | null;
    paymentTotalAmount: number | null;
    lineCount: number;
  }>;
};

type TopProducts = {
  period: { from: string; to: string; timezoneNote: string };
  items: Array<{
    productId: string;
    productName: string;
    totalQty: number;
    totalAmount: number;
  }>;
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function sevenDaysAgoUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 6);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(sevenDaysAgoUtc);
  const [to, setTo] = useState(todayUtc);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [top, setTop] = useState<TopProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const qp = useMemo(() => {
    const p = new URLSearchParams();
    p.set("from", from);
    p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`/api/v1/reports/sales-summary?${qp}`),
        fetch(`/api/v1/reports/top-products?${qp}&limit=15`)
      ]);
      if (sRes.status === 403 || tRes.status === 403) {
        setError("Solo administradores pueden ver reportes.");
        return;
      }
      if (!sRes.ok) throw new Error(await sRes.text());
      if (!tRes.ok) throw new Error(await tRes.text());
      setSummary((await sRes.json()) as SalesSummary);
      setTop((await tRes.json()) as TopProducts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [qp]);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadCsv() {
    if (!summary || !top) return;
    const rows: string[] = [];
    rows.push("Reporte de ventas");
    rows.push(`Período,${summary.period.from},${summary.period.to}`);
    rows.push(`Recreos cerrados,${summary.closedSessionsCount}`);
    rows.push(`Facturación total,${summary.totalRevenue.toFixed(2)}`);
    rows.push("");
    rows.push("Recreos en el período");
    rows.push("Cerrado,Líneas,Total,Cobro");
    for (const s of summary.sessions) {
      const closed = s.closedAt ? new Date(s.closedAt).toLocaleString() : "";
      const cobro = s.paymentMethod ?? "";
      const monto = s.paymentTotalAmount != null ? s.paymentTotalAmount.toFixed(2) : "";
      rows.push(`${closed},${s.lineCount},${s.totalAmount.toFixed(2)},${cobro} ${monto}`);
    }
    rows.push("");
    rows.push("Top productos");
    rows.push("Producto,Unidades,Importe");
    for (const r of top.items) {
      rows.push(`${r.productName},${r.totalQty},${r.totalAmount.toFixed(2)}`);
    }
    const csv = rows.join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ventas-${summary.period.from}-${summary.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 960 }}>
      <nav className="no-print" style={{ marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/admin" style={{ color: "#0066cc" }}>
          ← Admin
        </Link>
        <a href="/api/v1/auth/logout" style={{ color: "#333" }}>
          Cerrar sesión
        </a>
      </nav>

      <h1>Reportes de ventas</h1>
      <p style={{ color: "#555", fontSize: 14 }} className="no-print">
        Incluye solo recreos <strong>cerrados</strong> cuya fecha de cierre cae en el rango (UTC).
      </p>

      <div className="no-print" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Hasta
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Cargando…" : "Actualizar"}
        </button>
        {summary && top && (
          <>
            <button type="button" onClick={downloadCsv}>
              Descargar CSV
            </button>
            <button type="button" onClick={handlePrint}>
              Imprimir
            </button>
          </>
        )}
      </div>

      {error ? (
        <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>
      ) : null}

      {summary && !error ? (
        <>
          <section style={{ marginTop: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Recreos cerrados</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.closedSessionsCount}</div>
            </div>
            <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, minWidth: 160 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Facturación (suma totalAmount)</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                ${summary.totalRevenue.toFixed(2)}
              </div>
            </div>
          </section>
          <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{summary.period.timezoneNote}</p>

          <h2 style={{ marginTop: 32 }}>Últimos recreos en el período</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
                  <th style={{ padding: 8 }}>Cerrado</th>
                  <th style={{ padding: 8 }}>Líneas</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th style={{ padding: 8 }}>Cobro (info)</th>
                </tr>
              </thead>
              <tbody>
                {summary.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                      Sin datos en este rango.
                    </td>
                  </tr>
                ) : (
                  summary.sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>
                        {s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: 8 }}>{s.lineCount}</td>
                      <td style={{ padding: 8 }}>${s.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: 8 }}>
                        {s.paymentMethod ?? "—"}
                        {s.paymentTotalAmount != null
                          ? ` $${s.paymentTotalAmount.toFixed(2)}`
                          : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {top && !error ? (
        <>
          <h2 style={{ marginTop: 32 }}>Top productos</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
                  <th style={{ padding: 8 }}>Producto</th>
                  <th style={{ padding: 8 }}>Unidades</th>
                  <th style={{ padding: 8 }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {top.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 12, color: "#666" }}>
                      Sin ventas en el período.
                    </td>
                  </tr>
                ) : (
                  top.items.map((r) => (
                    <tr key={r.productId} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>{r.productName}</td>
                      <td style={{ padding: 8 }}>{r.totalQty}</td>
                      <td style={{ padding: 8 }}>${r.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
