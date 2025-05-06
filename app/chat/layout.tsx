import type { ReactNode } from "react";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen bg-background">
      {children}
    </section>
  );
}
