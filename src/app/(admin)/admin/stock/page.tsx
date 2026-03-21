"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Loader2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw,
  Boxes,
  AlertCircle,
  CheckCircle2,
  History
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  const [success, setSuccess] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [form, setForm] = useState<{
    type: "IN" | "ADJUST" | "EXPIRE";
    qty: number;
    reason: string;
  }>({ type: "IN", qty: 1, reason: "" });
  const [saving, setSaving] = useState(false);

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
    return stockItems.find((s) => s.productId === selectedProductId)?.stock ?? 0;
  }, [selectedProductId, stockItems]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedProductId) {
      setError("Selecciona un producto");
      return;
    }
    if (!form.reason.trim()) {
      setError("La razon es obligatoria");
      return;
    }
    setSaving(true);
    try {
      const qty = Number.isFinite(form.qty) ? form.qty : 0;
      const res = await fetch("/api/v1/inventory-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          type: form.type,
          qty,
          reason: form.reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error al guardar movimiento");
        return;
      }
      setForm({ type: "IN", qty: 1, reason: "" });
      await loadStock();
      await loadMovements(selectedProductId);
      showSuccess("Movimiento registrado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const movementTypes = [
    { value: "IN", label: "Ingreso", icon: ArrowUpCircle, color: "text-emerald-500" },
    { value: "ADJUST", label: "Ajuste", icon: RefreshCw, color: "text-blue-500" },
    { value: "EXPIRE", label: "Vencimiento", icon: ArrowDownCircle, color: "text-red-500" },
  ] as const;

  if (loading) {
    return (
      <AppShell header={<Header title="Stock" showNav={true} />}>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<Header title="Stock" showNav={true} />}>
      {/* Notifications */}
      {(error || success) && (
        <div className="absolute left-1/2 top-16 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Panel - Form */}
        <div className="flex flex-col gap-4 border-b border-border bg-card p-4 lg:w-[380px] lg:border-b-0 lg:border-r lg:overflow-auto">
          {/* Product Selector */}
          <div className="space-y-2">
            <Label>Producto</Label>
            <select
              className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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

          {/* Stock Display */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Boxes className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Stock Actual</span>
            </div>
            <span className="font-mono text-2xl font-bold text-foreground">
              {selectedStock ?? 0}
            </span>
          </div>

          {/* Movement Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                {movementTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: type.value }))}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all",
                        form.type === type.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", type.color)} />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Cantidad</Label>
              <Input
                id="qty"
                type="number"
                className="h-11"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.type === "IN" && "Se sumara al stock actual"}
                {form.type === "EXPIRE" && "Se restara del stock actual"}
                {form.type === "ADJUST" && "Valor positivo o negativo"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razon *</Label>
              <Input
                id="reason"
                className="h-11"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ej: Reposicion semanal"
                required
              />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Registrar Movimiento"
              )}
            </Button>
          </form>
        </div>

        {/* Right Panel - History */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Historial de Movimientos</h2>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Sin movimientos para este producto
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map((m) => {
                  const typeConfig = movementTypes.find((t) => t.value === m.type);
                  const Icon = typeConfig?.icon ?? RefreshCw;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className={cn("shrink-0", typeConfig?.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0">{m.type}</Badge>
                          <span className="font-mono font-semibold">
                            {m.type === "EXPIRE" ? "-" : m.type === "IN" ? "+" : ""}{m.qty}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{m.reason}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </AppShell>
  );
}
