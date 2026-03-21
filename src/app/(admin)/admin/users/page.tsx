"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Plus, 
  Loader2, 
  Users,
  UserCog,
  Shield,
  AlertCircle,
  CheckCircle2,
  Pencil
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

type User = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

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
          role: form.role,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setShowForm(false);
      setForm({ email: "", password: "", role: "OPERADOR" });
      await load();
      showSuccessMsg("Usuario creado");
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
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error");
      setEditing(null);
      setEditForm({ password: "", role: "OPERADOR" });
      await load();
      showSuccessMsg("Usuario actualizado");
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

  if (loading) {
    return (
      <AppShell header={<Header title="Usuarios" showNav={true} />}>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<Header title="Usuarios" showNav={true} />}>
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
        <div className="flex items-center justify-between border-b border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {users.length} usuario{users.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button onClick={() => setShowForm(true)} className="h-10 gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-muted-foreground">No hay usuarios creados</p>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      u.role === "ADMIN" 
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}>
                      {u.role === "ADMIN" ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <UserCog className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{u.email}</p>
                      <Badge 
                        variant={u.role === "ADMIN" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {u.role === "ADMIN" ? "Administrador" : "Operador"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Dialog */}
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
            <DialogTitle>Crear Usuario</DialogTitle>
            <DialogDescription>Email, contrasena y rol.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="operador@ejemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contrasena (min. 6)</Label>
              <Input
                id="password"
                type="password"
                className="h-11"
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
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  setForm({ email: "", password: "", role: "OPERADOR" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newpass">Nueva contrasena (opcional)</Label>
              <Input
                id="newpass"
                type="password"
                className="h-11"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Dejar vacio para no cambiar"
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editrole">Rol</Label>
              <select
                id="editrole"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || (!editForm.password.trim() && editForm.role === editing?.role)}
              >
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
