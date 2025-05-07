"use client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { ModeSwitcher } from "./mode-switcher";

// Dummy data, skal byttes ut med fetch fra API/DB
const demoConversations = [
  { id: "1", title: "Siste samtale", createdAt: new Date(), icon: <MessageSquare size={18} /> },
  { id: "2", title: "Spørsmål om faktura", createdAt: new Date(), icon: <MessageSquare size={18} /> },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  // TODO: Hent samtaler fra API/DB
  const [conversations, setConversations] = useState(demoConversations);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="mr-2">
          <span className="sr-only">Åpne samtaleliste</span>
          <MessageSquare className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-bold text-lg">Samtaler</span>
          <div className="flex items-center gap-2">
            <ModeSwitcher />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-muted-foreground">Ingen samtaler funnet.</div>
          ) : (
            <ul className="divide-y">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                    // onClick={() => { onSelectConversation(conv.id); setOpen(false); }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {conv.title?.[0] ?? "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium line-clamp-1">{conv.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {conv.createdAt.toLocaleString()}
                      </div>
                    </div>
                    {conv.icon}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full">Ny samtale</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
