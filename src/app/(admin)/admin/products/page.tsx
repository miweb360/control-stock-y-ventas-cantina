"use client";

import { useEffect, useState } from "react";
import { 
  Plus, 
  Loader2, 
  Search, 
  Package,
  Pencil,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    priceRef: 0,
    trackStock: true,
    status: "ACTIVO" as "ACTIVO" | "INACTIVO",
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

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

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
              status: form.status,
            };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setModal(null);
      setEditing(null);
      setForm({ name: "", barcode: "", priceRef: 0, trackStock: true, status: "ACTIVO" });
      await load();
      showSuccess(editing ? "Producto actualizado" : "Producto creado");
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
      status: (p.status as "ACTIVO" | "INACTIVO") ?? "ACTIVO",
    });
    setEditing(p);
    setModal("edit");
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      if (saving) return;
      setModal(null);
      setEditing(null);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <AppShell header={<Header title="Productos" showNav={true} />}>
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

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o codigo..."
              className="h-10 pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={openCreate} className="h-10 gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-3 text-muted-foreground">
                    {searchTerm ? "No se encontraron productos" : "No hay productos creados"}
                  </p>
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium text-foreground">{p.name}</h3>
                        <Badge variant={p.status === "ACTIVO" ? "default" : "secondary"} className="shrink-0">
                          {p.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">
                          ${p.priceRef.toFixed(2)}
                        </span>
                        {p.barcode && (
                          <span className="truncate text-xs">
                            Cod: {p.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={modal !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle>{modal === "create" ? "Nuevo Producto" : "Editar Producto"}</DialogTitle>
            <DialogDescription>
              {modal === "create" ? "Agregar al catalogo del kiosco." : "Actualizar datos del producto."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                className="h-11"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barcode">Codigo de barras</Label>
              <Input
                id="barcode"
                className="h-11"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priceRef">Precio *</Label>
              <Input
                id="priceRef"
                type="number"
                step="0.01"
                min={0}
                className="h-11"
                value={form.priceRef || ""}
                onChange={(e) => setForm((f) => ({ ...f, priceRef: Number(e.target.value) || 0 }))}
                required
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 rounded border-input accent-primary"
                checked={form.trackStock}
                onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
              />
              Controlar stock
            </label>
            {modal === "edit" && (
              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  className={cn(
                    "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  )}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "ACTIVO" | "INACTIVO" }))}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
