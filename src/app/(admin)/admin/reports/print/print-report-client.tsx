"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type DayDetail = {
  day: string;
  sessionCount: number;
  totalRevenue: number;
  sessions: Array<{
    id: string;
    closedAt: string | null;
    lineCount: number;
    totalAmount: number;
    items: Array<{ id: string; productName: string; qty: number; unitPriceRef: number; lineTotal: number }>;
  }>;
};

type RecessDetail = {
  id: string;
  closedAt: string | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  paymentTotalAmount: number | null;
  items: Array<{ id: string; productName: string; qty: number; unitPriceRef: number; lineTotal: number }>;
};

type PrintTarget = "daily" | "recess";

function parseList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PrintReportClient({ searchParams }: { searchParams: Record<string, string> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyItems, setDailyItems] = useState<DayDetail[]>([]);
  const [recessItems, setRecessItems] = useState<RecessDetail[]>([]);

  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const target = (searchParams.target === "recess" ? "recess" : "daily") as PrintTarget;
  const includeDetail = searchParams.includeDetail === "1" || searchParams.includeDetail === "true";
  const days = useMemo(() => parseList(searchParams.days ?? ""), [searchParams.days]);
  const recessIds = useMemo(() => parseList(searchParams.recessIds ?? ""), [searchParams.recessIds]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (target === "daily") {
          const qp = new URLSearchParams({ from, to });
          const res = await fetch(`/api/v1/reports/sales-by-day-detail?${qp.toString()}`);
          if (!res.ok) throw new Error(await res.text());
          const data = (await res.json()) as { items: DayDetail[] };
          const filtered = days.length > 0 ? data.items.filter((d) => days.includes(d.day)) : data.items;
          setDailyItems(filtered);
        } else {
          let ids = recessIds;
          if (ids.length === 0) {
            const qp = new URLSearchParams({ from, to, limit: "200" });
            const res = await fetch(`/api/v1/reports/sales-by-recess?${qp.toString()}`);
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as { items: Array<{ id: string }> };
            ids = data.items.map((i) => i.id);
          }
          const details = await Promise.all(
            ids.map(async (id) => {
              const res = await fetch(`/api/v1/recess-sessions/${id}`);
              if (!res.ok) throw new Error(await res.text());
              return (await res.json()) as RecessDetail;
            })
          );
          setRecessItems(details);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar reporte");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [from, to, target, days, recessIds]);

  const dailyTotals = useMemo(() => {
    const sessions = dailyItems.reduce((acc, d) => acc + d.sessionCount, 0);
    const amount = dailyItems.reduce((acc, d) => acc + d.totalRevenue, 0);
    return { sessions, amount };
  }, [dailyItems]);

  const recessTotals = useMemo(() => {
    const amount = recessItems.reduce((acc, r) => acc + (r.totalAmount ?? 0), 0);
    return { count: recessItems.length, amount };
  }, [recessItems]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="lg" onClick={() => window.close()}>
          Cerrar
        </Button>
        <Button type="button" size="lg" onClick={() => window.print()}>
          Imprimir reporte
        </Button>
      </div>

      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Reporte de ventas</h1>
        <p className="text-muted-foreground text-sm">
          Tipo: {target === "daily" ? "Ventas diarias" : "Ventas por recreo"} · Rango: {from} a {to}
        </p>
        <p className="text-muted-foreground text-sm">Emitido: {new Date().toLocaleString()}</p>
      </header>

      {loading ? <p>Cargando reporte…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && target === "daily" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Resumen diario · Días: {dailyItems.length} · Recreos: {dailyTotals.sessions} · Total: $
                {dailyTotals.amount.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Recreos</TableHead>
                    <TableHead className="text-right">Facturación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyItems.map((day) => (
                    <TableRow key={day.day}>
                      <TableCell>{day.day}</TableCell>
                      <TableCell>{day.sessionCount}</TableCell>
                      <TableCell className="text-right">${day.totalRevenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {includeDetail ?
            dailyItems.map((day) => (
              <Card key={`detail-${day.day}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Detalle día {day.day} · Recreos: {day.sessionCount} · Total: ${day.totalRevenue.toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {day.sessions.map((session) => (
                    <div key={session.id} className="rounded-md border p-3">
                      <p className="mb-2 text-sm font-medium">
                        Recreo {session.id.slice(0, 8)}… · {session.closedAt ? new Date(session.closedAt).toLocaleString() : "—"} ·
                        {" "}Total: ${session.totalAmount.toFixed(2)}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">${item.unitPriceRef.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          : null}
        </div>
      ) : null}

      {!loading && !error && target === "recess" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Resumen por recreo · Recreos: {recessTotals.count} · Total: ${recessTotals.amount.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recreo</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Cobro</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recessItems.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.id.slice(0, 8)}…</TableCell>
                      <TableCell>{session.closedAt ? new Date(session.closedAt).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        {session.paymentMethod ?? "—"}
                        {session.paymentTotalAmount != null ? ` $${session.paymentTotalAmount.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="text-right">${(session.totalAmount ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {includeDetail ?
            recessItems.map((session) => (
              <Card key={`detail-${session.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Recreo {session.id.slice(0, 8)}… · Total: ${(session.totalAmount ?? 0).toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right">${item.unitPriceRef.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          : null}
        </div>
      ) : null}
    </main>
  );
}

