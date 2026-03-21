"use client";

import { useTheme, ThemePalette } from "./theme-provider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const palettes: { value: ThemePalette; label: string; colors: { primary: string; accent: string } }[] = [
  { 
    value: "emerald", 
    label: "Esmeralda",
    colors: { primary: "bg-emerald-500", accent: "bg-teal-400" }
  },
  { 
    value: "cobalt", 
    label: "Cobalto",
    colors: { primary: "bg-blue-600", accent: "bg-sky-400" }
  },
  { 
    value: "amber", 
    label: "Ambar",
    colors: { primary: "bg-amber-500", accent: "bg-orange-400" }
  },
];

export function PaletteSelector() {
  const { palette, setPalette } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {palettes.map((p) => (
        <button
          key={p.value}
          onClick={() => setPalette(p.value)}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
            palette === p.value 
              ? "border-foreground scale-110" 
              : "border-transparent hover:scale-105"
          )}
          title={p.label}
        >
          <div className="flex h-6 w-6 overflow-hidden rounded-full">
            <div className={cn("h-full w-1/2", p.colors.primary)} />
            <div className={cn("h-full w-1/2", p.colors.accent)} />
          </div>
          {palette === p.value && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
