"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { 
  ShoppingCart, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode,
  Clock,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function SalePage() {
  const [session, setSession] = useState<OpenSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const addInFlightRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TRANSFERENCIA" | "QR">("EFECTIVO");
  const [paymentTotal, setPaymentTotal] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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

  // Focus barcode input when session opens
  useEffect(() => {
    if (session && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [session]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2000);
  };

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
      showSuccess("Recreo abierto");
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
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al agregar");
      setBarcode("");
      setQty(1);
      await loadCurrent();
      showSuccess("Producto agregado");
      barcodeInputRef.current?.focus();
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
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al cerrar");
      setSession(null);
      setPaymentTotal("");
      await loadCurrent();
      showSuccess(`Recreo cerrado - Total: $${Number(data.totalAmount).toFixed(2)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const subtotal = session?.items.reduce((s, i) => s + i.lineTotal, 0) ?? 0;
  const noBarcodeProducts = products.filter((p) => !p.barcode);

  const paymentMethods = [
    { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
    { value: "TRANSFERENCIA", label: "Transferencia", icon: CreditCard },
    { value: "QR", label: "QR", icon: QrCode },
  ] as const;

  // Loading state
  if (loading) {
    return (
      <AppShell header={<Header title="Punto de Venta" showNav={true} />}>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  // No session state
  if (!session) {
    return (
      <AppShell header={<Header title="Punto de Venta" showNav={true} />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <Clock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Recreo Cerrado</h2>
            <p className="mt-2 text-muted-foreground">
              No hay sesion activa. Abre un nuevo recreo para comenzar a vender.
            </p>
          </div>
          <Button
            size="lg"
            className="h-14 px-8 text-lg"
            disabled={busy}
            onClick={openRecess}
          >
            {busy ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-5 w-5" />
            )}
            Abrir Recreo
          </Button>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // Active session - Two column layout
  return (
    <AppShell header={<Header title="Punto de Venta" showNav={true} />}>
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
        {/* Left Panel - Input Area */}
        <div className="flex flex-col gap-4 overflow-auto border-b border-border bg-card p-4 lg:w-[400px] lg:border-b-0 lg:border-r">
          {/* Session info */}
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="font-medium text-foreground">Recreo Activo</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(session.openedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Barcode Scanner */}
          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Barcode className="h-4 w-4 text-primary" />
              Escanear Codigo
            </div>
            <div className="flex gap-2">
              <Input
                ref={barcodeInputRef}
                placeholder="Codigo de barras..."
                className="h-12 flex-1 text-base"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && barcode.trim()) {
                    e.preventDefault();
                    void addItem(true);
                  }
                }}
                autoComplete="off"
              />
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-mono text-sm">{qty}</span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={() => setQty(qty + 1)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Button
              className="h-11 w-full"
              disabled={busy || !barcode.trim()}
              onClick={() => addItem(true)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar
            </Button>
          </div>

          {/* Quick Products */}
          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Package className="h-4 w-4 text-primary" />
              Productos Rapidos
            </div>
            {noBarcodeProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay productos sin codigo de barras.
              </p>
            ) : (
              <>
                <select
                  className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  {noBarcodeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.priceRef.toFixed(2)}
                    </option>
                  ))}
                </select>
                <Button
                  className="h-11 w-full"
                  variant="secondary"
                  disabled={busy || !selectedProductId}
                  onClick={() => addItem(false)}
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Agregar Producto
                </Button>
              </>
            )}
          </div>

          {/* Payment Section */}
          <div className="mt-auto space-y-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
            <Label className="text-sm font-medium">Metodo de Pago</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition-all",
                      paymentMethod === method.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {method.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payTotal" className="text-sm">
                Monto Cobrado (opcional)
              </Label>
              <Input
                id="payTotal"
                type="number"
                min={0}
                step="0.01"
                className="h-11"
                value={paymentTotal}
                onChange={(e) => setPaymentTotal(e.target.value)}
                placeholder={subtotal.toFixed(2)}
              />
            </div>
            <Button
              className="h-12 w-full text-base font-semibold"
              disabled={busy || session.items.length === 0}
              onClick={closeRecess}
            >
              {busy ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              )}
              Cerrar Recreo
            </Button>
          </div>
        </div>

        {/* Right Panel - Ticket */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          {/* Ticket Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Ticket</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {session.items.length} items
              </span>
            </div>
          </div>

          {/* Ticket Items */}
          <ScrollArea className="flex-1 p-4">
            {session.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Escanea un producto para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {session.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.qty} x ${item.unitPriceRef.toFixed(2)}
                      </p>
                    </div>
                    <p className="ml-4 font-mono text-lg font-semibold text-foreground">
                      ${item.lineTotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Ticket Total */}
          <div className="border-t-2 border-primary/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-muted-foreground">Total</span>
              <span className="font-mono text-3xl font-bold text-foreground">
                ${subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
