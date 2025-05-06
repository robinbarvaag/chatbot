import { AIMessage, AIMessageContent } from '@/components/ui/kibo-ui/ai/message';

import { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: ReactNode;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="flex items-center gap-2 text-muted-foreground bg-muted px-4 py-2 rounded-full text-xs">
          {content}
        </div>
      </div>
    );
  }
  return (
    <AIMessage from={role === 'user' ? 'user' : 'assistant'}>
      <AIMessageContent>{content}</AIMessageContent>
    </AIMessage>
  );
}
