"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await res.json()) as { error?: string; user?: { role: string } };
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }
      const redirect = data.user?.role === "ADMIN" ? "/admin" : "/sale";
      router.push(from.startsWith("/admin") || from.startsWith("/sale") ? from : redirect);
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          padding: 24,
          border: "1px solid #ccc",
          borderRadius: 8,
          width: "100%",
          maxWidth: 320
        }}
      >
        <h1 style={{ marginBottom: 16 }}>Iniciar sesión</h1>
        {error && (
          <p style={{ color: "#c00", marginBottom: 12, fontSize: 14 }} role="alert">
            {error}
          </p>
        )}
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: "100%",
              padding: 8,
              fontSize: 16,
              boxSizing: "border-box"
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: 8,
              fontSize: 16,
              boxSizing: "border-box"
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            fontSize: 16,
            backgroundColor: loading ? "#999" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
