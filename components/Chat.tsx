"use client"
import { useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { AIResponse } from '@/components/ui/kibo-ui/ai/response';

export default function Chat() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Hei! Hvordan kan jeg hjelpe deg?' }
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(message: string) {
    setMessages(msgs => [...msgs, { role: 'user', content: message }]);
    setLoading(true);
    const newMessages = [...messages, { role: 'user', content: message }];
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
    let aiMsg = '';
    setMessages(msgs => [...msgs, { role: 'assistant', content: '' }]);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        aiMsg += decoder.decode(value);
        function processMarkdown(md: string): string {
          // 1. Flytt språk fra første linje inni kodeblokker opp til triple backticks
          let out = md.replace(
            /```[\t ]*\n([a-zA-Z0-9]+)\n([\s\S]+?)```/g,
            (match, lang, code) => {
              return `\\\${lang}\n${code}\\\`;
            }
          );
          out = out.replace(/```([a-zA-Z0-9]+)\n([\s\S]+?)```/g, (match, lang, code) => {
            return `\\\${lang}\n${code}\\\`;
          });
          // 2. Bytt ut ```javascript med ```jsx
          out = out.replace(/```javascript/g, '```jsx');
          // 3. Sørg for blank linje før og etter kodeblokk
          out = out.replace(/([^\n])```jsx/g, '$1\n```jsx');
          out = out.replace(/```jsx([^\n])/g, '```jsx\n$1');
          out = out.replace(/([^\n])```/g, '$1\n```');
          out = out.replace(/```([^\n])/g, '```\n$1');
          // 4. Bytt ut rare tegn med ekte triple backticks
          out = out.replace(/\\\/g, '```');
          return out;
        }
        const processedMsg = processMarkdown(aiMsg);
        setMessages(msgs =>
          msgs.map((m, i) =>
            i === msgs.length - 1 ? { ...m, content: processedMsg } : m
          )
        );
      }
    }
    setLoading(false);
  }


  console.log(messages); 

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="space-y-2 mb-4">
        {messages.map((msg, idx) => {
          if (msg.role === 'assistant') {
            // Bruk AIResponse for markdown/kode/lenker
            return (
              <div key={idx} className="w-full flex justify-start">
                <div className="flex-1">
                  <ChatMessage role="assistant" content={<AIResponse>{msg.content}</AIResponse>} />
                </div>
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
