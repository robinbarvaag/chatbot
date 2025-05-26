import Chat from '../../../../components/Chat';

export default async function ChatPage({ params }: { params: { conversationId: string } }) {

const {conversationId} = await params;
  return (
    <main className="flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Chatbot</h1>
      <Chat conversationId={conversationId}  />
    </main>
  );    
}
