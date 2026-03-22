"use client";

import Link from "next/link";
import { 
  Users, 
  Package, 
  BarChart3, 
  Boxes,
  ArrowRight,
  Store
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/admin/users",
    title: "Usuarios",
    description: "Gestiona operadores y administradores del sistema",
    icon: Users,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    href: "/admin/products",
    title: "Productos",
    description: "Catalogo, codigos de barras y precios de referencia",
    icon: Package,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/admin/stock",
    title: "Stock",
    description: "Ingresos, ajustes y bajas por vencimiento",
    icon: Boxes,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    href: "/admin/reports",
    title: "Reportes",
    description: "Ventas por recreo, por dia y productos mas vendidos",
    icon: BarChart3,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
] as const;

export default function AdminPage() {
  return (
    <AppShell header={<Header title="Panel de Administracion" showNav={true} />}>
      <div className="flex flex-1 flex-col overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Bienvenido al Panel
            </h1>
            <p className="text-muted-foreground">
              Kiosco escolar - control de mercaderia y ventas por recreo
            </p>
          </div>

          {/* Quick Access to POS */}
          <Link
            href="/sale"
            className="group flex items-center justify-between rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40 hover:bg-primary/10 md:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Store className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Punto de Venta</h2>
                <p className="text-sm text-muted-foreground">
                  Ir al modo de venta para atender recreos
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Navigation Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md md:p-5"
                >
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", item.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
