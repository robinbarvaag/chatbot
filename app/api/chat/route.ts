import { NextRequest, NextResponse } from 'next/server';
import { chatWithOpenAI, getEmbedding } from '../../../lib/openai';
import { queryPinecone } from '../../../lib/pinecone';
import { sanityClient } from '../../../sanity/client';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, conversationId: clientConversationId } = body;

  // Hent bruker fra session
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  // Finn brukerens siste spørsmål
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content;

  // === LAGRING AV SAMTALE/MELDINGER ===
  let conversationId = clientConversationId;
  let conversation;
  if (!conversationId) {
    // Opprett ny samtale hvis ikke id er sendt inn
    conversation = await prisma.conversation.create({
      data: {
        title: lastUserMsg?.slice(0, 40) || 'Ny samtale',
        ...(userEmail ? { user: { connect: { email: userEmail } } } : {}),
      },
    });
    conversationId = conversation.id;
  } else {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  }

  // Lagre alle meldinger som ikke allerede finnes (enkel logikk: lagre alle for demo)
  if (conversationId) {
    for (const m of messages) {
      // Sjekk om meldingen allerede finnes (unik per samtale, rolle og innhold)
      const exists = await prisma.message.findFirst({
        where: {
          conversationId,
          role: m.role,
          content: m.content,
        },
      });
      if (!exists) {
        await prisma.message.create({
          data: {
            conversation: { connect: { id: conversationId } },
            role: m.role,
            content: m.content,
            // Bare knytt bruker til 'user'-meldinger
            ...(userEmail && m.role === 'user' ? { user: { connect: { email: userEmail } } } : {}),
          },
        });
      }
    }
  }

  // === RESTEN AV LOGIKKEN (AI, ARTIKLER, STREAM) ===
  let pineconeMatches: any[] = [];
  let pineconeContext: any[] = [];
  let sanityPromise: Promise<any[]> | undefined = undefined;

  if (lastUserMsg) {
    // 1. Lag embedding av brukerens spørsmål
    const embedding = await getEmbedding(lastUserMsg);
    // 2. Søk i Pinecone etter relevante artikler
    pineconeMatches = await queryPinecone(embedding, 3);
    // 3. Bygg kontekst til OpenAI av Pinecone-treff (bruk metadata/tittel/body hvis mulig)
    pineconeContext = pineconeMatches.map(m => ({ title: m.metadata?.title, body: m.metadata?.body || '' }));
    // 4. Start henting av artikler fra Sanity parallelt
    const ids = pineconeMatches.map((m: any) => m.id);
    if (ids.length > 0) {
      sanityPromise = sanityClient.fetch(
        `*[_type == "article" && _id in $ids]{_id, title, body}`,
        { ids }
      ).then((sanityArticles: any[]) =>
        sanityArticles.map((a: any) => {
          const match = pineconeMatches.find((m: any) => m.id === a._id);
          return {
            ...a,
            score: match?.score,
            metadata: match?.metadata,
          };
        })
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Start parallell henting av artikler fra Sanity
      let sanitySent = false;
      let sanityArticles: any[] = [];
      if (sanityPromise) {
        sanityPromise.then((arts) => {
          sanityArticles = arts;
          controller.enqueue(encoder.encode(`event: articles\ndata: ${JSON.stringify(sanityArticles)}\n\n`));
          sanitySent = true;
        });
      }
      // Bruk chatWithOpenAI for streaming og tools, send pineconeArticles som cmsData
      const pineconeArticles = pineconeMatches.map(m => ({
        _id: m.id,
        title: m.metadata?.title,
        body: m.metadata?.body || '',
        score: m.score
      }));
      const openaiStream = await chatWithOpenAI(messages, pineconeArticles);
      const reader = openaiStream.getReader();
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          // Vi må wrappe content som SSE-event
          controller.enqueue(encoder.encode(`event: content\ndata: ${JSON.stringify(new TextDecoder().decode(value))}\n\n`));
        }
      }
      // Hvis artikler ikke har blitt sendt enda (f.eks. hvis OpenAI er raskere enn Sanity)
      if (sanityPromise && !sanitySent) {
        sanityArticles = await sanityPromise;
        controller.enqueue(encoder.encode(`event: articles\ndata: ${JSON.stringify(sanityArticles)}\n\n`));
      }
      // Send conversationId til frontend
      controller.enqueue(encoder.encode(`event: conversationId\ndata: ${JSON.stringify(conversationId)}\n\n`));
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}