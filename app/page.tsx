import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Velkommen til Chatbot-demo</h1>
      <Link href="/chat" className="text-blue-600 underline">Gå til chat</Link>
    </main>
  );
}
