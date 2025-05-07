import Chat from '../../../components/Chat';


export default function ChatPage() {
  return (
    <main className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Chatbot</h1>
      <Chat />
    </main>
  );
}
