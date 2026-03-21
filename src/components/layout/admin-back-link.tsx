"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function AdminBackLink() {
  return (
    <nav className="no-print mb-6">
      <Link
        href="/admin"
        className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "touch-h touch-text px-3")}
      >
        ← Volver al panel
      </Link>
    </nav>
  );
}
