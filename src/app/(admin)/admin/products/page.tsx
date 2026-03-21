"use client";

import { useEffect, useState } from "react";
import { AdminBackLink } from "@/components/layout/admin-back-link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

const inputTouch = "min-h-12 text-base";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    priceRef: 0,
    trackStock: true,
    status: "ACTIVO" as "ACTIVO" | "INACTIVO"
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
              status: form.status
            };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setModal(null);
      setEditing(null);
      setForm({ name: "", barcode: "", priceRef: 0, trackStock: true, status: "ACTIVO" });
      await load();
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
      status: (p.status as "ACTIVO" | "INACTIVO") ?? "ACTIVO"
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

  return (
    <main>
      <PageShell>
        <AdminBackLink />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Productos</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Catálogo para venta y control de stock
            </p>
          </div>
          <Button type="button" size="lg" className="touch-h touch-text w-full sm:w-auto" onClick={openCreate}>
            + Nuevo producto
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-6" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 rounded-xl border border-border bg-card ring-1 ring-foreground/10">
          {loading ? (
            <p className="text-muted-foreground p-6">Cargando…</p>
          ) : (
            <ScrollArea className="w-full max-h-[min(70vh,560px)] sm:max-h-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Código</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {p.barcode ?? "—"}
                      </TableCell>
                      <TableCell>${p.priceRef.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "ACTIVO" ? "default" : "secondary"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="touch-h touch-text"
                          onClick={() => openEdit(p)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

        <Dialog open={modal !== null} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton={!saving}>
            <DialogHeader>
              <DialogTitle>{modal === "create" ? "Nuevo producto" : "Editar producto"}</DialogTitle>
              <DialogDescription>
                {modal === "create" ? "Agregar al catálogo del kiosco." : "Actualizar datos del producto."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  className={inputTouch}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode">Código de barras</Label>
                <Input
                  id="barcode"
                  className={inputTouch}
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceRef">Precio referencia *</Label>
                <Input
                  id="priceRef"
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputTouch}
                  value={form.priceRef || ""}
                  onChange={(e) => setForm((f) => ({ ...f, priceRef: Number(e.target.value) || 0 }))}
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm sm:text-base">
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
                      "border-input bg-background flex w-full rounded-lg border px-3 py-2 outline-none",
                      inputTouch
                    )}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as "ACTIVO" | "INACTIVO" }))
                    }
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
                  size="lg"
                  className="touch-h touch-text"
                  disabled={saving}
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" className="touch-h touch-text" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageShell>
    </main>
  );
}
