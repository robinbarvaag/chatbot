"use client"
import * as React from "react";
import { ConversationContext } from "./ui/app-sidebar";

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  return (
    <ConversationContext.Provider value={{ conversationId, setConversationId }}>
      {children}
    </ConversationContext.Provider>
  );
}
