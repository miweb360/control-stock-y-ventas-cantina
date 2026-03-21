"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

const selectField =
  "flex min-h-12 w-full max-w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none";

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
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TRANSFERENCIA" | "QR">("EFECTIVO");
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
      const body: { paymentMethod: string; paymentTotalAmount?: number } = { paymentMethod };
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

  const subtotal = session?.items.reduce((s, i) => s + i.lineTotal, 0) ?? 0;
  const noBarcodeProducts = products.filter((p) => !p.barcode);

  return (
    <main>
      <PageShell className="max-w-2xl lg:max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Modo venta (recreo)
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Un recreo abierto a la vez. Código de barras o selección rápida.
            </p>
          </div>
          <a
            href="/api/v1/auth/logout"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "no-print touch-h touch-text shrink-0 self-start"
            )}
          >
            Cerrar sesión
          </a>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-4" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground mt-8">Cargando…</p>
        ) : !session ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recreo cerrado</CardTitle>
              <CardDescription>No hay sesión activa. Abrí un nuevo recreo para vender.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                size="lg"
                className="min-h-14 w-full text-base sm:w-auto sm:min-w-[200px]"
                disabled={busy}
                onClick={openRecess}
              >
                Abrir recreo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">Recreo abierto</span> desde{" "}
              {new Date(session.openedAt).toLocaleString()} ·{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{session.id.slice(0, 8)}…</code>
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Escanear / código</CardTitle>
                <CardDescription>Lector pistola o teclado; Enter para agregar</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="grid min-w-0 flex-1 gap-2 sm:min-w-[200px]">
                  <Label htmlFor="barcode">Código de barras</Label>
                  <Input
                    id="barcode"
                    className="min-h-12 text-base"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addItem(true);
                      }
                    }}
                    placeholder="Escanear…"
                    autoComplete="off"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-28">
                  <Label htmlFor="qty">Cantidad</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    max={999}
                    className="min-h-12 text-base"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value) || 1)}
                  />
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full sm:w-auto"
                  disabled={busy || !barcode.trim()}
                  onClick={() => addItem(true)}
                >
                  Agregar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sin código (rápido)</CardTitle>
                <CardDescription>Productos vendidos por unidad sin barcode</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="grid min-w-0 flex-1 gap-2">
                  <Label htmlFor="productPick">Producto</Label>
                  <select
                    id="productPick"
                    className={selectField}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    {noBarcodeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.priceRef.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full sm:w-auto"
                  disabled={busy || !selectedProductId}
                  onClick={() => addItem(false)}
                >
                  Agregar
                </Button>
              </CardContent>
              {noBarcodeProducts.length === 0 ? (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm">
                    No hay productos sin código. Creálos en Admin → Productos.
                  </p>
                </CardContent>
              ) : null}
            </Card>

            <div>
              <h2 className="font-heading mb-3 text-lg font-semibold">Ticket del recreo</h2>
              <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/10">
                <ScrollArea className="max-h-[min(40vh,320px)] w-full sm:max-h-[280px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.productName}</TableCell>
                          <TableCell className="text-right tabular-nums">{i.qty}</TableCell>
                          <TableCell className="text-right tabular-nums">${i.lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
              <p className="mt-3 text-right text-xl font-semibold tabular-nums sm:text-2xl">
                Total: ${subtotal.toFixed(2)}
              </p>
            </div>

            <Card className="border-primary/20 bg-primary/5 ring-1 ring-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Cerrar recreo</CardTitle>
                <CardDescription>Cobro informativo (sin pasarela de pago)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="payMethod">Medio</Label>
                  <select
                    id="payMethod"
                    className={selectField}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="QR">QR</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payTotal">Monto cobrado (opcional)</Label>
                  <Input
                    id="payTotal"
                    type="number"
                    min={0}
                    step="0.01"
                    className="min-h-12 max-w-xs text-base"
                    value={paymentTotal}
                    onChange={(e) => setPaymentTotal(e.target.value)}
                    placeholder={subtotal.toFixed(2)}
                  />
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-14 w-full text-base"
                  disabled={busy}
                  onClick={closeRecess}
                >
                  Cerrar recreo y generar resumen
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </main>
  );
}
