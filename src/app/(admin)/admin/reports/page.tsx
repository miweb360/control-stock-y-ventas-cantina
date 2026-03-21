"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBackLink } from "@/components/layout/admin-back-link";
import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

type SalesByRecess = {
  period: { from: string; to: string; timezoneNote: string };
  items: Array<{
    id: string;
    openedAt: string;
    closedAt: string | null;
    totalAmount: number;
    paymentMethod: string | null;
    paymentTotalAmount: number | null;
    lineCount: number;
  }>;
};

type SalesByDay = {
  period: { from: string; to: string; timezoneNote: string };
  items: Array<{
    day: string;
    sessionCount: number;
    totalRevenue: number;
  }>;
};

type SaleDetailItem = {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  qty: number;
  unitPriceRef: number;
  lineTotal: number;
  createdAt: string;
};

type SalesByDayDetail = {
  period: { from: string; to: string; timezoneNote: string };
  items: Array<{
    day: string;
    sessionCount: number;
    totalRevenue: number;
    sessions: Array<{
      id: string;
      openedAt: string;
      closedAt: string | null;
      totalAmount: number;
      paymentMethod: string | null;
      paymentTotalAmount: number | null;
      lineCount: number;
      items: SaleDetailItem[];
    }>;
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

const dateInput = "min-h-12 text-base";
const selectInput =
  "flex min-h-12 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none";

export default function ReportsPage() {
  const [from, setFrom] = useState(sevenDaysAgoUtc);
  const [to, setTo] = useState(todayUtc);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [top, setTop] = useState<TopProducts | null>(null);
  const [byRecess, setByRecess] = useState<SalesByRecess | null>(null);
  const [byDay, setByDay] = useState<SalesByDay | null>(null);
  const [byDayDetail, setByDayDetail] = useState<SalesByDayDetail | null>(null);
  const [includePrintDetail, setIncludePrintDetail] = useState(false);
  const [selectedRecessId, setSelectedRecessId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<"daily" | "recess">("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedRecessIds, setSelectedRecessIds] = useState<string[]>([]);
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
      const [sRes, tRes, rRes, dRes, ddRes] = await Promise.all([
        fetch(`/api/v1/reports/sales-summary?${qp}`),
        fetch(`/api/v1/reports/top-products?${qp}&limit=15`),
        fetch(`/api/v1/reports/sales-by-recess?${qp}&limit=50`),
        fetch(`/api/v1/reports/sales-by-day?${qp}`),
        fetch(`/api/v1/reports/sales-by-day-detail?${qp}`)
      ]);
      if (
        sRes.status === 403 ||
        tRes.status === 403 ||
        rRes.status === 403 ||
        dRes.status === 403 ||
        ddRes.status === 403
      ) {
        setError("Solo administradores pueden ver reportes.");
        return;
      }
      if (!sRes.ok) throw new Error(await sRes.text());
      if (!tRes.ok) throw new Error(await tRes.text());
      if (!rRes.ok) throw new Error(await rRes.text());
      if (!dRes.ok) throw new Error(await dRes.text());
      if (!ddRes.ok) throw new Error(await ddRes.text());
      setSummary((await sRes.json()) as SalesSummary);
      setTop((await tRes.json()) as TopProducts);
      setByRecess((await rRes.json()) as SalesByRecess);
      setByDay((await dRes.json()) as SalesByDay);
      setByDayDetail((await ddRes.json()) as SalesByDayDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [qp]);

  useEffect(() => {
    void load();
  }, [load]);

  const detailBySessionId = useMemo(() => {
    const index = new Map<string, SalesByDayDetail["items"][number]["sessions"][number]>();
    for (const day of byDayDetail?.items ?? []) {
      for (const session of day.sessions) {
        index.set(session.id, session);
      }
    }
    return index;
  }, [byDayDetail]);

  const selectedSessionDetail = selectedRecessId ? detailBySessionId.get(selectedRecessId) ?? null : null;
  const selectedDayDetail = useMemo(
    () => byDayDetail?.items.find((d) => d.day === selectedDay) ?? null,
    [byDayDetail, selectedDay]
  );

  function toggleDay(day: string) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleRecess(id: string) {
    setSelectedRecessIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function buildExportParams() {
    const p = new URLSearchParams();
    p.set("from", from);
    p.set("to", to);
    p.set("includeDetail", includePrintDetail ? "1" : "0");
    if (reportTarget === "daily" && selectedDays.length > 0) {
      p.set("days", selectedDays.join(","));
    }
    if (reportTarget === "recess" && selectedRecessIds.length > 0) {
      p.set("recessIds", selectedRecessIds.join(","));
    }
    return p;
  }

  function downloadCsv() {
    const p = buildExportParams();
    const endpoint =
      reportTarget === "daily" ? "/api/v1/reports/export/daily" : "/api/v1/reports/export/recess";
    window.location.href = `${endpoint}?${p.toString()}`;
  }

  function openPrintReport() {
    const p = buildExportParams();
    p.set("target", reportTarget);
    window.open(`/admin/reports/print?${p.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main>
      <PageShell className="max-w-6xl">
        <AdminBackLink />

        <div className="no-print mb-4 flex flex-wrap gap-3">
          <a
            href="/api/v1/auth/logout"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "touch-h touch-text")}
          >
            Cerrar sesión
          </a>
        </div>

        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Reportes de ventas
        </h1>
        <p className="text-muted-foreground no-print mt-1 text-sm sm:text-base">
          Solo recreos <strong>cerrados</strong> en el rango (UTC).
        </p>

        <div className="no-print mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              className={dateInput}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" type="date" className={dateInput} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            type="button"
            size="lg"
            className="touch-h touch-text w-full sm:w-auto"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Cargando…" : "Actualizar"}
          </Button>
          <label className="flex min-h-12 items-center gap-2 rounded-md border px-3 text-sm">
            <input
              type="checkbox"
              checked={includePrintDetail}
              onChange={(e) => setIncludePrintDetail(e.target.checked)}
            />
            Incluir detalle en impresión/CSV
          </label>
          <div className="grid gap-2">
            <Label htmlFor="target">Reporte a exportar/imprimir</Label>
            <select
              id="target"
              className={selectInput}
              value={reportTarget}
              onChange={(e) => setReportTarget(e.target.value as "daily" | "recess")}
            >
              <option value="daily">Ventas diarias</option>
              <option value="recess">Ventas por recreo</option>
            </select>
          </div>
          {summary && top && byRecess && byDay && byDayDetail ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="touch-h touch-text w-full sm:w-auto"
                onClick={downloadCsv}
              >
                Descargar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="touch-h touch-text w-full sm:w-auto"
                onClick={openPrintReport}
              >
                Imprimir
              </Button>
            </>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-6" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {summary && !error ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Recreos cerrados</CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">
                    {summary.closedSessionsCount}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Facturación (suma totalAmount)</CardDescription>
                  <CardTitle className="text-3xl font-semibold tabular-nums">
                    ${summary.totalRevenue.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            <p className="text-muted-foreground mt-2 text-xs sm:text-sm">{summary.period.timezoneNote}</p>

            <h2 className="font-heading mt-10 text-xl font-semibold">Ventas por recreo</h2>
            <div className="mt-4 rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              <ScrollArea className="max-h-[min(50vh,400px)] w-full sm:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="no-print">Sel.</TableHead>
                      <TableHead>Cerrado</TableHead>
                      <TableHead>Líneas</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden md:table-cell">Cobro (info)</TableHead>
                      <TableHead className="no-print text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byRecess && byRecess.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Sin datos en este rango.
                        </TableCell>
                      </TableRow>
                    ) : (
                      byRecess?.items.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="no-print">
                            <input
                              type="checkbox"
                              checked={selectedRecessIds.includes(s.id)}
                              onChange={() => toggleRecess(s.id)}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell>{s.lineCount}</TableCell>
                          <TableCell className="tabular-nums">${s.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {s.paymentMethod ?? "—"}
                            {s.paymentTotalAmount != null ? ` $${s.paymentTotalAmount.toFixed(2)}` : ""}
                          </TableCell>
                          <TableCell className="no-print text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              onClick={() => setSelectedRecessId(s.id)}
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <h2 className="font-heading mt-10 text-xl font-semibold">Ventas diarias</h2>
            <div className="mt-4 rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              <ScrollArea className="max-h-[min(45vh,360px)] w-full sm:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="no-print">Sel.</TableHead>
                      <TableHead>Día (UTC)</TableHead>
                      <TableHead>Recreos cerrados</TableHead>
                      <TableHead>Facturación</TableHead>
                      <TableHead className="no-print text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDay && byDay.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          Sin datos en este rango.
                        </TableCell>
                      </TableRow>
                    ) : (
                      byDay?.items.map((d) => (
                        <TableRow key={d.day}>
                          <TableCell className="no-print">
                            <input
                              type="checkbox"
                              checked={selectedDays.includes(d.day)}
                              onChange={() => toggleDay(d.day)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{d.day}</TableCell>
                          <TableCell>{d.sessionCount}</TableCell>
                          <TableCell className="tabular-nums">${d.totalRevenue.toFixed(2)}</TableCell>
                          <TableCell className="no-print text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              onClick={() => setSelectedDay(d.day)}
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
            <p className="text-muted-foreground no-print mt-2 text-xs">
              Seleccionados: {selectedDays.length} día(s) y {selectedRecessIds.length} recreo(s). Si no seleccionás
              nada, exporta/imprime todo el rango filtrado.
            </p>
          </>
        ) : null}

        {top && !error ? (
          <>
            <h2 className="font-heading mt-10 text-xl font-semibold">Top productos</h2>
            <div className="mt-4 rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              <ScrollArea className="max-h-[min(45vh,360px)] w-full sm:max-h-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Sin ventas en el período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      top.items.map((r) => (
                        <TableRow key={r.productId}>
                          <TableCell className="font-medium">{r.productName}</TableCell>
                          <TableCell>{r.totalQty}</TableCell>
                          <TableCell className="tabular-nums">${r.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        ) : null}

        {includePrintDetail && byDayDetail ? (
          <div className="mt-10">
            <h2 className="font-heading text-xl font-semibold">Detalle de ventas (impresión opcional)</h2>
            {byDayDetail.items.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">Sin detalle para imprimir en este rango.</p>
            ) : (
              <div className="mt-4 space-y-6">
                {byDayDetail.items.map((day) => (
                  <Card key={day.day}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Día {day.day}</CardTitle>
                      <CardDescription>
                        Recreos: {day.sessionCount} · Total: ${day.totalRevenue.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {day.sessions.map((s) => (
                        <div key={s.id} className="rounded-md border p-3">
                          <p className="text-sm font-medium">
                            Recreo {s.id.slice(0, 8)}… · {s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"} · $
                            {s.totalAmount.toFixed(2)}
                          </p>
                          <div className="mt-2 rounded-md border">
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
                                {s.items.map((item) => (
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
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PageShell>

      <Dialog open={selectedRecessId !== null} onOpenChange={(open) => !open && setSelectedRecessId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta por recreo</DialogTitle>
            <DialogDescription>
              {selectedSessionDetail ?
                `Recreo ${selectedSessionDetail.id.slice(0, 8)}… · ${selectedSessionDetail.closedAt ? new Date(selectedSessionDetail.closedAt).toLocaleString() : "—"}`
              : "Cargando detalle..."}
            </DialogDescription>
          </DialogHeader>
          {selectedSessionDetail ? (
            <div className="space-y-3">
              <p className="text-sm">
                Líneas: {selectedSessionDetail.lineCount} · Total: ${selectedSessionDetail.totalAmount.toFixed(2)}
              </p>
              <div className="rounded-md border">
                <ScrollArea className="max-h-[50vh]">
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
                      {selectedSessionDetail.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right">${item.unitPriceRef.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta diaria</DialogTitle>
            <DialogDescription>
              {selectedDayDetail ?
                `${selectedDayDetail.day} · Recreos: ${selectedDayDetail.sessionCount} · Total: $${selectedDayDetail.totalRevenue.toFixed(2)}`
              : "Cargando detalle..."}
            </DialogDescription>
          </DialogHeader>
          {selectedDayDetail ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-2">
                {selectedDayDetail.sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Recreo {session.id.slice(0, 8)}…</CardTitle>
                      <CardDescription>
                        {session.closedAt ? new Date(session.closedAt).toLocaleString() : "—"} · Líneas: {session.lineCount}
                        {" · "}Total: ${session.totalAmount.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
