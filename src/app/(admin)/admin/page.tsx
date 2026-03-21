import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/admin/users",
    title: "Usuarios",
    description: "Alta y edición de operadores y administradores"
  },
  {
    href: "/admin/products",
    title: "Productos",
    description: "Catálogo, códigos de barras y precios de referencia"
  },
  {
    href: "/admin/stock",
    title: "Stock",
    description: "Ingresos, ajustes y bajas por vencimiento"
  },
  {
    href: "/admin/reports",
    title: "Reportes",
    description: "Ventas por recreo, por día y productos más vendidos"
  }
] as const;

export default function AdminPage() {
  return (
    <main>
      <PageShell>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Panel administración
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Kiosco escolar — control de mercadería y ventas por recreo
          </p>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-xl no-underline outline-none">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="gap-1">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="no-print mt-8">
          <Separator className="mb-6" />
          <a
            href="/api/v1/auth/logout"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "touch-h touch-text inline-flex w-full justify-center sm:w-auto"
            )}
          >
            Cerrar sesión
          </a>
        </div>
      </PageShell>
    </main>
  );
}
