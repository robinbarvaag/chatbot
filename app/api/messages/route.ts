import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/(auth)/auth';

// GET /api/messages?conversationId=xyz
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId mangler' }, { status: 400 });
  }
  const session = await auth();
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
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json(messages);
}
