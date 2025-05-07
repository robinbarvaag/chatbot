"use client"
import { useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { AIResponse } from '@/components/ui/kibo-ui/ai/response';

export default function Chat() {
  type ChatMessage = { role: 'user' | 'assistant' | 'system', content: string, articles?: any[] };
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Hei! Hvordan kan jeg hjelpe deg?' }
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(message: string) {
    setMessages(msgs => [...msgs, { role: 'user', content: message }]);
    setLoading(true);
    const newMessages = [...messages, { role: 'user', content: message }];

    // Start streaming
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    });
    if (!res.body) {
      setMessages(msgs => [...msgs, { role: 'assistant', content: 'Ingen svar fra AI.' }]);
      setLoading(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let aiContent = '';
    let articles: any[] | undefined = undefined;
    let assistantMsgIdx: number | undefined = undefined;
    // Sett placeholder for AI-melding
    setMessages(msgs => {
      assistantMsgIdx = msgs.length;
      return [...msgs, { role: 'assistant', content: '' }];
    });
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value);
        // SSE: flere events kan komme i samme chunk, så splitt på dobbel newline
        const events = chunk.split(/\n\n+/);
        for (const eventStr of events) {
          if (!eventStr.trim()) continue;
          const [eventLine, ...dataLines] = eventStr.split('\n');
          const eventType = eventLine.replace('event: ', '').trim();
          const dataRaw = dataLines.map(l => l.replace(/^data: /, '')).join('\n');
          if (eventType === 'articles') {
            try { articles = JSON.parse(dataRaw); } catch {}
            // Legg til artikler på AI-meldingen
            setMessages(msgs => msgs.map((m, i) =>
              i === assistantMsgIdx ? { ...m, articles } : m
            ));
          } else if (eventType === 'content') {
            let content = '';
            try { content = JSON.parse(dataRaw); } catch { content = dataRaw; }
            aiContent += content;
            setMessages(msgs => msgs.map((m, i) =>
              i === assistantMsgIdx ? { ...m, content: aiContent } : m
            ));
          }
        }
      }
    }
    setLoading(false);
  }


  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="space-y-2 mb-4">
        {messages.map((msg, idx) => {
          if (msg.role === 'assistant') {
            return (
              <div key={idx} className="w-full flex flex-col gap-2">
                <div className="flex-1">
                  <ChatMessage role="assistant" content={<AIResponse>{msg.content}</AIResponse>} />
                </div>
                {msg.articles && msg.articles.length > 0 && (
                  <div className="bg-gray-50 border rounded p-3 mt-1">
                    <div className="font-semibold text-xs text-gray-600 mb-1">Relevante artikler brukt i svaret:</div>
                    <ul className="space-y-2">
                      {msg.articles.map((a: any) => {
                        const score = typeof a.score === 'number' ? a.score : (typeof a.metadata?.score === 'number' ? a.metadata.score : undefined);
                        return (
                          <li key={a._id} className="border-b last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-sm text-gray-800">{a.title}</div>
                                {typeof score === 'number' && (
                                  <span className="text-xs text-gray-500 ml-2">Relevans: {(score * 100).toFixed(0)}%</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">{a.body}</div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            );
          }
          return <ChatMessage key={idx} role={msg.role as 'user' | 'system'} content={msg.content} />;
        })}
        {loading && <ChatMessage role="assistant" content="Skriver ..." />}
      </div>
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
