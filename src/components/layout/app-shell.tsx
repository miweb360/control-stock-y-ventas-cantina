"use client";

import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function AppShell({ children, header, className }: AppShellProps) {
  return (
    <div className={cn("flex h-dvh flex-col overflow-hidden bg-background", className)}>
      {header}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
