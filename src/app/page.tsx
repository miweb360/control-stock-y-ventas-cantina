import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main>
      <PageShell className="max-w-2xl">
        <div className="flex flex-col gap-8 py-8 sm:py-12">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Control de Stock y Ventas
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Kiosco escolar — control de mercadería y ventas por recreo
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bienvenido</CardTitle>
              <CardDescription>
                Iniciá sesión para acceder al panel de administración o al modo venta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "touch-h touch-text w-full sm:w-auto sm:min-w-[200px]"
                )}
              >
                Iniciar sesión
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </main>
  );
}
