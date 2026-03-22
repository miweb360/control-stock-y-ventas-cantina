"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PaletteSelector } from "@/components/theme/palette-selector";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; user?: { role: string } };
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesion");
        return;
      }
      const redirect = data.user?.role === "ADMIN" ? "/admin" : "/sale";
      router.push(from.startsWith("/admin") || from.startsWith("/sale") ? from : redirect);
      router.refresh();
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden flex-1 flex-col justify-between bg-primary p-8 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary-foreground">Cantina</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground text-balance">
            Control de Stock y Ventas
          </h1>
          <p className="max-w-md text-lg text-primary-foreground/80">
            Sistema integral para la gestion de tu kiosco escolar. 
            Administra productos, controla inventario y registra ventas de manera eficiente.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/60">
          Kiosco escolar - Sistema de gestion
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col">
        {/* Theme Controls */}
        <div className="flex items-center justify-end gap-3 p-4">
          <PaletteSelector />
          <div className="h-4 w-px bg-border" />
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-8">
            {/* Mobile Logo */}
            <div className="flex flex-col items-center gap-3 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                <Store className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Cantina</h1>
                <p className="text-sm text-muted-foreground">Control de Stock y Ventas</p>
              </div>
            </div>

            {/* Desktop Title */}
            <div className="hidden space-y-2 lg:block">
              <h2 className="text-2xl font-bold text-foreground">Bienvenido</h2>
              <p className="text-muted-foreground">Ingresa tus credenciales para continuar</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="h-12 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contrasena"
                    className="h-12 pr-12 text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
