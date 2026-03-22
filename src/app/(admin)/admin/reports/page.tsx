"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  BarChart3,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Download,
  Printer,
  Eye,
  DollarSign,
  Clock
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

type ReportTab = "overview" | "daily" | "recess" | "top";

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
  const [reportTab, setReportTab] = useState<ReportTab>("overview");

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
        fetch(`/api/v1/reports/sales-by-day-detail?${qp}`),
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

  function printRecessSession(sessionId: string, closedAt: string | null, openedAt: string) {
    const day = (closedAt ?? openedAt).slice(0, 10);
    const p = new URLSearchParams();
    p.set("from", day);
    p.set("to", day);
    p.set("target", "recess");
    p.set("recessIds", sessionId);
    p.set("includeDetail", "1");
    window.open(`/admin/reports/print?${p.toString()}`, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <AppShell header={<Header title="Reportes" showNav={true} />}>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell header={<Header title="Reportes" showNav={true} />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <BarChart3 className="h-12 w-12 text-destructive/50" />
          <p className="text-destructive">{error}</p>
          <Button onClick={() => load()}>Reintentar</Button>
        </div>
      </AppShell>
    );
  }

  const tabDefs: { id: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { id: "overview", label: "Resumen", icon: BarChart3 },
    { id: "daily", label: "Ventas diarias", icon: Calendar },
    { id: "recess", label: "Por recreo", icon: ShoppingBag },
    { id: "top", label: "Top productos", icon: TrendingUp },
  ];

  return (
    <AppShell header={<Header title="Reportes" showNav={true} />}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="from" className="text-sm">Desde</Label>
            <Input
              id="from"
              type="date"
              className="h-9 w-36"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="to" className="text-sm">Hasta</Label>
            <Input
              id="to"
              type="date"
              className="h-9 w-36"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => load()}>
            Actualizar
          </Button>
          <div className="h-6 w-px bg-border" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            value={reportTarget}
            onChange={(e) => setReportTarget(e.target.value as "daily" | "recess")}
          >
            <option value="daily">Diario</option>
            <option value="recess">Por Recreo</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePrintDetail}
              onChange={(e) => setIncludePrintDetail(e.target.checked)}
              className="accent-primary"
            />
            Incluir detalle
          </label>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={openPrintReport}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Vista por pestañas */}
        <div className="flex flex-wrap gap-2 border-b border-border bg-muted/30 px-4 py-2">
          {tabDefs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={reportTab === id ? "default" : "ghost"}
              size="sm"
              className={cn("gap-2", reportTab === id && "shadow-sm")}
              onClick={() => setReportTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content: scroll interno (min-h-0 evita que flex impida el scroll) */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-4 md:p-6">
            {reportTab === "overview" && summary && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Facturacion Total</CardDescription>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-2xl font-bold">${summary.totalRevenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Recreos Cerrados</CardDescription>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-2xl font-bold">{summary.closedSessionsCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Promedio por Recreo</CardDescription>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-2xl font-bold">
                      ${summary.closedSessionsCount > 0
                        ? (summary.totalRevenue / summary.closedSessionsCount).toFixed(2)
                        : "0.00"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Dias con Ventas</CardDescription>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-2xl font-bold">{byDay?.items.length ?? 0}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {reportTab === "daily" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Ventas Diarias</CardTitle>
                  </div>
                  <CardDescription>
                    Marca dias para CSV o imprimir; el ojo abre el detalle del dia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[min(520px,calc(100dvh-14rem))]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Dia</TableHead>
                          <TableHead className="text-center">Recreos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byDay?.items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Sin datos
                            </TableCell>
                          </TableRow>
                        ) : (
                          byDay?.items.map((d) => (
                            <TableRow key={d.day}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedDays.includes(d.day)}
                                  onChange={() => toggleDay(d.day)}
                                  className="accent-primary"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{d.day}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{d.sessionCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${d.totalRevenue.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedDay(d.day)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {reportTab === "top" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Top Productos</CardTitle>
                  </div>
                  <CardDescription>Ranking por monto en el rango de fechas.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[min(520px,calc(100dvh-14rem))]">
                    <div className="space-y-1 p-4">
                      {top?.items.length === 0 ? (
                        <p className="text-center text-muted-foreground">Sin ventas</p>
                      ) : (
                        top?.items.map((product, index) => (
                          <div
                            key={product.productId}
                            className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
                          >
                            <span className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              index < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.totalQty} unidades
                              </p>
                            </div>
                            <span className="font-mono text-sm font-semibold">
                              ${product.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {reportTab === "recess" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Ventas por Recreo</CardTitle>
                  </div>
                  <CardDescription>
                    Seleccionados: {selectedDays.length} dia(s) y {selectedRecessIds.length} recreo(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[min(520px,calc(100dvh-14rem))]">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Cerrado</TableHead>
                        <TableHead className="text-center">Lineas</TableHead>
                        <TableHead>Metodo</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byRecess?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Sin datos
                          </TableCell>
                        </TableRow>
                      ) : (
                        byRecess?.items.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedRecessIds.includes(s.id)}
                                onChange={() => toggleRecess(s.id)}
                                className="accent-primary"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.closedAt ? new Date(s.closedAt).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{s.lineCount}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.paymentMethod ?? "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              ${s.totalAmount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedRecessId(s.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Recess Detail Dialog */}
      <Dialog open={selectedRecessId !== null} onOpenChange={(open) => !open && setSelectedRecessId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Recreo</DialogTitle>
            <DialogDescription>
              {selectedSessionDetail
                ? `${selectedSessionDetail.closedAt ? new Date(selectedSessionDetail.closedAt).toLocaleString() : "-"} - Total: $${selectedSessionDetail.totalAmount.toFixed(2)}`
                : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          {selectedSessionDetail && (
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
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right font-mono">${item.unitPriceRef.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">${item.lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {selectedSessionDetail && selectedRecessId ? (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  printRecessSession(
                    selectedRecessId,
                    selectedSessionDetail.closedAt,
                    selectedSessionDetail.openedAt
                  )
                }
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del Dia {selectedDay}</DialogTitle>
            <DialogDescription>
              {selectedDayDetail
                ? `Recreos: ${selectedDayDetail.sessionCount} - Total: $${selectedDayDetail.totalRevenue.toFixed(2)}`
                : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          {selectedDayDetail && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {selectedDayDetail.sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Recreo {session.id.slice(0, 8)}...
                        </CardTitle>
                        <span className="font-mono font-semibold">
                          ${session.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <CardDescription>
                        {session.closedAt ? new Date(session.closedAt).toLocaleTimeString() : "-"} - {session.lineCount} items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right font-mono">${item.lineTotal.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
