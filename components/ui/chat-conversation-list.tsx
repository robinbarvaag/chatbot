"use client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export type Conversation = {
  id: string;
  title: string | null;
  createdAt: string;
  messages: { id: string }[];
};

export function ChatConversationList({ onSelectConversation }: {
  onSelectConversation?: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/conversations")
      .then((res) => {
        if (!res.ok) throw new Error("Kunne ikke hente samtaler");
        return res.json();
      })
      .then(setConversations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-muted-foreground">Laster samtaler...</div>;
  }
  if (error) {
    return <div className="p-4 rounded-md bg-destructive text-destructive-foreground mt-8">{error}</div>;
  }
  if (conversations.length === 0) {
    return <div className="p-4 text-muted-foreground">Ingen samtaler funnet.</div>;
  }

  // Slett samtale-funksjon
  async function handleDeleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation();
    if (!window.confirm('Er du sikker på at du vil slette denne samtalen?')) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId })
      });
      if (!res.ok) throw new Error('Kunne ikke slette samtale');
      setConversations(conversations => conversations.filter(c => c.id !== convId));
    } catch (err: any) {
      alert(err.message || 'Noe gikk galt ved sletting');
    }
  }

  return (  
    <ul className="flex flex-col gap-2">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link href={`/chat/${conv.id}`}>
              <div className="group relative flex items-center gap-2 px-2 py-1 rounded-md border bg-card hover:bg-accent transition-colors cursor-pointer">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {conv.title?.[0]?.toUpperCase() ?? "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground line-clamp-1 leading-tight">{conv.title || "(Uten tittel)"}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
                    {new Date(conv.createdAt).toLocaleString()}
                  </div>
                </div>
                <MessageSquare size={16} className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <button
            title="Slett samtale"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={e => handleDeleteConversation(e, conv.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7v13a2 2 0 002 2h8a2 2 0 002-2V7M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3m-7 0h10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6m4-6v6" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
