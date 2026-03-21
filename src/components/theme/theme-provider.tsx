"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePalette = "emerald" | "cobalt" | "amber";

interface ThemeContextType {
  mode: ThemeMode;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ThemePalette) => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultPalette?: ThemePalette;
}

export function ThemeProvider({
  children,
  defaultMode = "system",
  defaultPalette = "emerald",
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [palette, setPaletteState] = useState<ThemePalette>(defaultPalette);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
    const savedPalette = localStorage.getItem("theme-palette") as ThemePalette | null;
    
    if (savedMode) setModeState(savedMode);
    if (savedPalette) setPaletteState(savedPalette);
    setMounted(true);
  }, []);

  // Resolve actual mode (handle "system" preference)
  useEffect(() => {
    if (!mounted) return;

    const resolveMode = () => {
      if (mode === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return mode;
    };

    const updateResolvedMode = () => {
      const resolved = resolveMode();
      setResolvedMode(resolved);
      
      // Update document class
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };

    updateResolvedMode();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") {
        updateResolvedMode();
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode, mounted]);

  // Apply palette class to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove("palette-emerald", "palette-cobalt", "palette-amber");
    root.classList.add(`palette-${palette}`);
  }, [palette, mounted]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("theme-mode", newMode);
  };

  const setPalette = (newPalette: ThemePalette) => {
    setPaletteState(newPalette);
    localStorage.setItem("theme-palette", newPalette);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, palette, setMode, setPalette, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
