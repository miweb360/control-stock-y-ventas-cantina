import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-8 lg:max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
