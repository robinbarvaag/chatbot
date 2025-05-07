import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// POST /api/messages/save-assistant
export async function POST(req: NextRequest) {
  const { conversationId, content } = await req.json();
  if (!conversationId || !content) {
    return NextResponse.json({ error: 'conversationId og content må sendes' }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
  }
  // Sjekk at samtalen tilhører brukeren
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { user: true },
  });
  if (!conversation || conversation.user?.email !== session.user.email) {
    return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
  }
  // Lagre assistant-melding
  const msg = await prisma.message.create({
    data: {
      conversation: { connect: { id: conversationId } },
      role: 'assistant',
      content,
    },
  });
  return NextResponse.json(msg);
}
