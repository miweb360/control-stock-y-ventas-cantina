"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Barcode,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

/** Respuesta de GET /api/v1/recess-sessions/[id] tras cerrar el recreo */
type ClosedSessionDetail = {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  paymentTotalAmount: number | null;
  items: SessionItem[];
};

const QUICK_MODAL_PAGE_SIZE = 8;
/** A–Z + Ñ (español) */
const ALPHABET_LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export default function SalePage() {
  const [session, setSession] = useState<OpenSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const addInFlightRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TRANSFERENCIA" | "QR">("EFECTIVO");
  const [paymentTotal, setPaymentTotal] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [closedSessionDetail, setClosedSessionDetail] = useState<ClosedSessionDetail | null>(null);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickLetter, setQuickLetter] = useState<string | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickPage, setQuickPage] = useState(0);

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

  useEffect(() => {
    if (!session) setQuickModalOpen(false);
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

  async function addItem(byBarcode: boolean, productIdForQuick?: string) {
    if (!session) return;
    const productId = productIdForQuick ?? "";
    if (!byBarcode && !productId) return;
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
        : { productId, qty, idempotencyKey };
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

  function printClosedSession(detail: ClosedSessionDetail) {
    const day = (detail.closedAt ?? detail.openedAt).slice(0, 10);
    const p = new URLSearchParams();
    p.set("from", day);
    p.set("to", day);
    p.set("target", "recess");
    p.set("recessIds", detail.id);
    p.set("includeDetail", "1");
    window.open(`/admin/reports/print?${p.toString()}`, "_blank", "noopener,noreferrer");
  }

  async function closeRecess() {
    if (!session) return;
    setBusy(true);
    setError("");
    const sessionId = session.id;
    try {
      const body: { paymentMethod: string; paymentTotalAmount?: number } = { paymentMethod };
      const pt = paymentTotal.trim();
      if (pt !== "") {
        const n = Number(pt);
        if (!Number.isNaN(n) && n >= 0) body.paymentTotalAmount = n;
      }
      const res = await fetch(`/api/v1/recess-sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al cerrar");
      setPaymentTotal("");
      const detailRes = await fetch(`/api/v1/recess-sessions/${sessionId}`);
      let detail: ClosedSessionDetail | null = null;
      if (detailRes.ok) {
        detail = (await detailRes.json()) as ClosedSessionDetail;
      }
      await loadCurrent();
      if (detail) {
        setClosedSessionDetail(detail);
      } else {
        showSuccess(`Recreo cerrado - Total: $${Number(data.totalAmount).toFixed(2)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const subtotal = session?.items.reduce((s, i) => s + i.lineTotal, 0) ?? 0;
  const noBarcodeProducts = products.filter((p) => !p.barcode);

  const filteredQuickProducts = useMemo(() => {
    return noBarcodeProducts
      .filter((p) => {
        const n = normalizeForSearch(p.name);
        if (quickLetter) {
          const L = normalizeForSearch(quickLetter);
          if (!n.startsWith(L)) return false;
        }
        const q = quickSearch.trim();
        if (q) {
          if (!n.includes(normalizeForSearch(q))) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [noBarcodeProducts, quickLetter, quickSearch]);

  useEffect(() => {
    setQuickPage(0);
  }, [quickLetter, quickSearch]);

  useEffect(() => {
    const pc = Math.max(1, Math.ceil(filteredQuickProducts.length / QUICK_MODAL_PAGE_SIZE));
    setQuickPage((p) => Math.min(p, pc - 1));
  }, [filteredQuickProducts.length]);

  const quickPageCount = Math.max(
    1,
    Math.ceil(filteredQuickProducts.length / QUICK_MODAL_PAGE_SIZE)
  );
  const quickPageSafe = Math.min(quickPage, quickPageCount - 1);
  const quickPageItems = filteredQuickProducts.slice(
    quickPageSafe * QUICK_MODAL_PAGE_SIZE,
    quickPageSafe * QUICK_MODAL_PAGE_SIZE + QUICK_MODAL_PAGE_SIZE
  );

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

  return (
    <AppShell header={<Header title="Punto de Venta" showNav={true} />}>
      {!session ? (
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
      ) : (
        <>
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
              <p className="text-xs text-muted-foreground">
                Cantidad del panel (arriba) se usa al tocar un producto en la grilla.
              </p>
            )}
            {noBarcodeProducts.length > 0 ? (
              <Button
                type="button"
                className="h-11 w-full"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setQuickLetter(null);
                  setQuickSearch("");
                  setQuickPage(0);
                  setQuickModalOpen(true);
                }}
              >
                <Package className="mr-2 h-4 w-4" />
                Elegir producto
              </Button>
            ) : null}
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
              disabled={busy}
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
        </>
      )}

      <Dialog
        open={quickModalOpen}
        onOpenChange={(open) => {
          setQuickModalOpen(open);
          if (open) {
            setQuickLetter(null);
            setQuickSearch("");
            setQuickPage(0);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl" showCloseButton>
          <div className="border-b border-border p-4 pb-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Productos rapidos
              </DialogTitle>
              <DialogDescription>
                Letra: nombre que <strong>empieza</strong> por · Buscar: <strong>contiene</strong> el texto. Toca una
                tarjeta para agregar la cantidad indicada arriba (escaner).
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[min(65dvh,520px)] space-y-3 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Inicial del nombre</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={quickLetter === null ? "default" : "outline"}
                  className="h-8 min-w-10 px-2 text-xs"
                  onClick={() => setQuickLetter(null)}
                >
                  Todas
                </Button>
                {ALPHABET_LETTERS.map((L) => (
                  <Button
                    key={L}
                    type="button"
                    size="sm"
                    variant={quickLetter === L ? "default" : "outline"}
                    className="h-8 min-w-8 px-0 text-xs"
                    onClick={() => setQuickLetter(L)}
                  >
                    {L}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-search" className="text-xs text-muted-foreground">
                Buscar en el nombre (contiene)
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="quick-search"
                  className="h-10 pl-9"
                  placeholder="Ej. choco"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {quickPageItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ningun producto coincide con el filtro.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quickPageItems.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void addItem(false, p.id)}
                    className={cn(
                      "flex flex-col items-stretch rounded-xl border border-border bg-card p-3 text-left transition-colors",
                      "hover:border-primary/50 hover:bg-accent/30 active:scale-[0.98]",
                      "disabled:pointer-events-none disabled:opacity-50"
                    )}
                  >
                    <span className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight">{p.name}</span>
                    <span className="mt-2 font-mono text-base font-semibold text-primary">
                      ${p.priceRef.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filteredQuickProducts.length === 0
                ? "0 productos"
                : `${quickPageSafe + 1} / ${quickPageCount} · ${filteredQuickProducts.length} producto(s)`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={quickPageSafe <= 0}
                onClick={() => setQuickPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={quickPageSafe >= quickPageCount - 1}
                onClick={() => {
                  const pc = Math.max(
                    1,
                    Math.ceil(filteredQuickProducts.length / QUICK_MODAL_PAGE_SIZE)
                  );
                  setQuickPage((p) => Math.min(pc - 1, p + 1));
                }}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={closedSessionDetail !== null} onOpenChange={(open) => !open && setClosedSessionDetail(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Recreo cerrado</DialogTitle>
            <DialogDescription>
              {closedSessionDetail
                ? `Cerrado: ${closedSessionDetail.closedAt ? new Date(closedSessionDetail.closedAt).toLocaleString() : "—"}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {closedSessionDetail ? (
            <>
              <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-muted-foreground">Total sesion</span>
                  <span className="font-mono font-semibold">
                    ${(closedSessionDetail.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-muted-foreground">Metodo de pago</span>
                  <span>{closedSessionDetail.paymentMethod ?? "—"}</span>
                </div>
                {closedSessionDetail.paymentTotalAmount != null ? (
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted-foreground">Monto cobrado</span>
                    <span className="font-mono">${closedSessionDetail.paymentTotalAmount.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
              <ScrollArea className="max-h-[50vh] rounded-md border">
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
                    {closedSessionDetail.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Sin lineas (recreo sin ventas)
                        </TableCell>
                      </TableRow>
                    ) : (
                      closedSessionDetail.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right font-mono">${item.unitPriceRef.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ${item.lineTotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setClosedSessionDetail(null)}>
              Cerrar
            </Button>
            {closedSessionDetail ? (
              <Button type="button" onClick={() => printClosedSession(closedSessionDetail)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
