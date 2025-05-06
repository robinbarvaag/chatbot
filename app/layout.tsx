import "../globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Brukerhenting via NextAuth kommer senere
  return (
    <html lang="no">
      <body className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto w-full py-8 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
