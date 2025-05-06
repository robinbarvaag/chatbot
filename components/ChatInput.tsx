import { useState } from 'react';
import { AIInput, AIInputTextarea, AIInputSubmit } from '@/components/ui/kibo-ui/ai/input';
import { SendIcon } from 'lucide-react';

export default function ChatInput({ onSend, disabled }: { onSend: (msg: string) => void, disabled: boolean }) {
  const [input, setInput] = useState('');
  return (
    <AIInput
      onSubmit={e => {
        e.preventDefault();
        if (input.trim()) {
          onSend(input);
          setInput('');
        }
      }}
      className="mt-2"
    >
      <AIInputTextarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Skriv en melding ..."
        disabled={disabled}
        minHeight={48}
        maxHeight={120}
        autoFocus
      />
      <div className="flex justify-end p-2">
        <AIInputSubmit disabled={disabled || !input.trim()} >
          <SendIcon size={16} />
        </AIInputSubmit>
      </div>
    </AIInput>
  );
}
