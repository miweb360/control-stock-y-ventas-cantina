"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { 
  LogOut, 
  Settings, 
  User as UserIcon,
  Store,
  LayoutDashboard,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PaletteSelector } from "@/components/theme/palette-selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title?: string;
  showNav?: boolean;
  className?: string;
}

export function Header({ title, showNav = true, className }: HeaderProps) {
  const router = useRouter();
  const { user, mutate } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      mutate(undefined, false);
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = user?.role === "ADMIN" 
    ? [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/sale", label: "Punto de Venta", icon: Store },
      ]
    : [
        { href: "/sale", label: "Punto de Venta", icon: Store },
      ];

  return (
    <header className={cn(
      "flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4",
      className
    )}>
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Store className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground">
          {title ?? "Cantina"}
        </span>
      </div>

      {/* Center: Navigation (if admin) */}
      {showNav && user?.role === "ADMIN" && (
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.href)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      )}

      {/* Right: Theme controls & User menu */}
      <div className="flex items-center gap-3">
        {/* Theme Controls */}
        <div className="hidden items-center gap-2 md:flex">
          <PaletteSelector />
          <div className="h-4 w-px bg-border" />
          <ThemeToggle />
        </div>

        {/* User Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden flex-col items-start text-left lg:flex">
                  <span className="text-sm font-medium leading-none">{user.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Mobile: Theme controls */}
              <div className="flex items-center justify-between px-2 py-1.5 md:hidden">
                <span className="text-xs text-muted-foreground">Tema</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 md:hidden">
                <span className="text-xs text-muted-foreground">Color</span>
                <PaletteSelector />
              </div>
              <DropdownMenuSeparator className="md:hidden" />

              {/* Mobile: Nav links */}
              {showNav && (
                <>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem 
                        key={item.href} 
                        onClick={() => router.push(item.href)}
                        className="md:hidden"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator className="md:hidden" />
                </>
              )}

              {user.role === "ADMIN" && (
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuracion
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={handleLogout} 
                disabled={loggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? "Cerrando..." : "Cerrar sesion"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
