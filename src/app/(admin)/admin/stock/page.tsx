"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminBackLink } from "@/components/layout/admin-back-link";
import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const field = "min-h-12 w-full text-base rounded-lg border border-input bg-background px-3 py-2 outline-none";

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
      setError("La razón es obligatoria");
      return;
    }
    const qty = Number.isFinite(form.qty) ? form.qty : 0;
    const res = await fetch("/api/v1/inventory-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProductId,
        type: form.type,
        qty,
        reason: form.reason.trim()
      })
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
    <main>
      <PageShell>
        <AdminBackLink />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Stock / Movimientos
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Ingresos, ajustes y bajas; historial por producto
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Stock actual:</span>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {selectedStock === null ? "—" : selectedStock}
            </Badge>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-6" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground mt-8">Cargando…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            <Card className="w-full shrink-0 lg:max-w-xl">
              <CardHeader>
                <CardTitle>Registrar movimiento</CardTitle>
                <CardDescription>IN, ajuste o vencimiento con trazabilidad</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="product">Producto</Label>
                    <select
                      id="product"
                      className={field}
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.barcode ? `(${p.barcode})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mtype">Tipo</Label>
                    <select
                      id="mtype"
                      className={field}
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value as "IN" | "ADJUST" | "EXPIRE" }))
                      }
                    >
                      <option value="IN">IN (ingreso / reposición)</option>
                      <option value="ADJUST">ADJUST (delta + o −)</option>
                      <option value="EXPIRE">EXPIRE (baja por vencimiento)</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mqty">Cantidad</Label>
                    <Input
                      id="mqty"
                      type="number"
                      className="min-h-12 text-base"
                      value={form.qty}
                      onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                    />
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      {form.type === "IN" && "Se registra como +cantidad"}
                      {form.type === "EXPIRE" && "Se registra como −cantidad"}
                      {form.type === "ADJUST" && "Delta positivo o negativo"}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason">Razón *</Label>
                    <Input
                      id="reason"
                      className="min-h-12 text-base"
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Ej: reposición semanal / merma"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" size="lg" className="touch-h touch-text flex-1">
                      Guardar movimiento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="touch-h touch-text flex-1"
                      onClick={() => setForm({ type: "IN", qty: 1, reason: "" })}
                    >
                      Limpiar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="min-w-0 flex-1">
              <CardHeader>
                <CardTitle>Últimos movimientos</CardTitle>
                <CardDescription>Filtrados por el producto seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <ScrollArea className="max-h-[min(50vh,400px)] w-full sm:max-h-[560px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="min-w-[120px]">Razón</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            Sin movimientos para este producto.
                          </TableCell>
                        </TableRow>
                      ) : (
                        movements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                              {new Date(m.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{m.type}</Badge>
                            </TableCell>
                            <TableCell>{m.qty}</TableCell>
                            <TableCell className="max-w-[200px] truncate sm:max-w-none">
                              {m.reason}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </main>
  );
}
