"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 800 }}>
      <nav className="no-print" style={{ marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/admin" style={{ color: "#0066cc" }}>
          ← Admin
        </Link>
        <a href="/api/v1/auth/logout" style={{ color: "#333" }}>
          Cerrar sesión
        </a>
      </nav>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1>Usuarios</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={loading}
          style={{ padding: "8px 16px" }}
        >
          Nuevo usuario
        </button>
      </div>
      <p style={{ color: "#555", fontSize: 14, marginTop: 4 }}>
        Crear operadores (y opcionalmente administradores) para que accedan al sistema.
      </p>

      {error ? <p style={{ color: "crimson", marginTop: 12 }}>{error}</p> : null}

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 20,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 360
          }}
        >
          <h3 style={{ margin: 0 }}>Crear usuario</h3>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="operador@ejemplo.com"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Contraseña (mín. 6 caracteres)
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Rol
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "OPERADOR" }))}
            >
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ email: "", password: "", role: "OPERADOR" });
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {editing ? (
        <form
          onSubmit={handleEditSubmit}
          style={{
            marginTop: 20,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 360
          }}
        >
          <h3 style={{ margin: 0 }}>Editar: {editing.email}</h3>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Nueva contraseña (dejar vacío para no cambiar)
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              minLength={6}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Rol
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "OPERADOR" }))}
            >
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving || (!editForm.password.trim() && editForm.role === editing.role)}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setEditForm({ password: "", role: "OPERADOR" });
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div style={{ marginTop: 24, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Rol</th>
              <th style={{ padding: 8 }}>Creado</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                  Cargando…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 12, color: "#666" }}>
                  Sin usuarios.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button type="button" onClick={() => openEdit(u)} style={{ fontSize: 12 }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
