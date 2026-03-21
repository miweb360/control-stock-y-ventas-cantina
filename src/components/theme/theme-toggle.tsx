"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, ThemeMode } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const modes: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="h-4 w-4" />, label: "Claro" },
    { value: "dark", icon: <Moon className="h-4 w-4" />, label: "Oscuro" },
    { value: "system", icon: <Monitor className="h-4 w-4" />, label: "Sistema" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={cn(
            "flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
            mode === m.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={m.label}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}
