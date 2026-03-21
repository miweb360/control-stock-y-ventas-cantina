"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminBackLink } from "@/components/layout/admin-back-link";
import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
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

type User = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

const selectTouch =
  "flex min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", role: "OPERADOR" as "ADMIN" | "OPERADOR" });
  const [editForm, setEditForm] = useState({ password: "", role: "OPERADOR" as "ADMIN" | "OPERADOR" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/users");
      if (res.status === 403) {
        setError("Solo administradores pueden gestionar usuarios.");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: User[] };
      setUsers(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          role: form.role
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setShowForm(false);
      setForm({ email: "", password: "", role: "OPERADOR" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const body: { password?: string; role?: string } = { role: editForm.role };
      if (editForm.password.trim()) body.password = editForm.password;
      const res = await fetch(`/api/v1/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setEditing(null);
      setEditForm({ password: "", role: "OPERADOR" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(u: User) {
    setEditing(u);
    setEditForm({ password: "", role: (u.role as "ADMIN" | "OPERADOR") || "OPERADOR" });
    setError("");
  }

  return (
    <main>
      <PageShell>
        <AdminBackLink />

        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <a
            href="/api/v1/auth/logout"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "touch-h touch-text")}
          >
            Cerrar sesión
          </a>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Usuarios</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Operadores y administradores del kiosco
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="touch-h touch-text w-full sm:w-auto"
            disabled={loading}
            onClick={() => setShowForm(true)}
          >
            Nuevo usuario
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
            <ScrollArea className="w-full max-h-[min(70vh,520px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="hidden sm:table-cell">Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Sin usuarios.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                          {new Date(u.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="touch-h touch-text"
                            onClick={() => openEdit(u)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            if (!open && !saving) {
              setShowForm(false);
              setForm({ email: "", password: "", role: "OPERADOR" });
              setError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription>Email, contraseña y rol.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="min-h-12 text-base"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="operador@ejemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña (mín. 6)</Label>
                <Input
                  id="password"
                  type="password"
                  className="min-h-12 text-base"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  className={selectTouch}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "OPERADOR" }))}
                >
                  <option value="OPERADOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="touch-h touch-text"
                  disabled={saving}
                  onClick={() => {
                    setShowForm(false);
                    setForm({ email: "", password: "", role: "OPERADOR" });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" className="touch-h touch-text" disabled={saving}>
                  {saving ? "Creando…" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open && !saving) {
              setEditing(null);
              setEditForm({ password: "", role: "OPERADOR" });
              setError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>{editing?.email}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="newpass">Nueva contraseña (opcional)</Label>
                <Input
                  id="newpass"
                  type="password"
                  className="min-h-12 text-base"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Dejar vacío para no cambiar"
                  minLength={6}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editrole">Rol</Label>
                <select
                  id="editrole"
                  className={selectTouch}
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "OPERADOR" }))}
                >
                  <option value="OPERADOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="touch-h touch-text"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="touch-h touch-text"
                  disabled={
                    saving || (!editForm.password.trim() && editForm.role === editing?.role)
                  }
                >
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
