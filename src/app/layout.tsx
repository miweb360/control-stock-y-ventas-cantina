import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Control de Stock y Ventas",
  description: "Kiosco escolar - control de mercadería y tickets por recreo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdf4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f15" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="h-dvh overflow-hidden">
        <SWRProvider>
          <ThemeProvider defaultMode="system" defaultPalette="emerald">
            {children}
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
