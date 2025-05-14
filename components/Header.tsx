import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignOutForm } from "@/components/sign-out-form";

export default function Header({ user }: { user?: { name?: string|null, image?: string|null } }) {
  return (
    <header className="w-full border-b bg-background">
      <nav className="flex items-center justify-between max-w-5xl mx-auto px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg text-primary">Chatbot</Link>
          <Link href="/chat" className="text-muted-foreground hover:text-primary transition-colors">Chat</Link>
          <Link href="/sanity" className="text-muted-foreground hover:text-primary transition-colors">Sanity</Link>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <SignOutForm />
            </>
          ) : (
            <>
              <Link href="/login"><Button>Logg inn</Button></Link>
              <Link href="/register"><Button variant="outline">Registrer</Button></Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
