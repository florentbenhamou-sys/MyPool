import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Auto Coûts", template: "%s · Auto Coûts" },
  description: "Gestion et simulation des coûts automobiles du foyer",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <div className="md:flex">
          <Nav />
          <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8 max-w-7xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
