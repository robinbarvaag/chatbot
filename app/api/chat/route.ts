import { NextRequest, NextResponse } from 'next/server';
import { chatWithOpenAI, getEmbedding } from '@/lib/openai';
import { queryPinecone } from '@/lib/pinecone';
import { sanityClient } from '@/sanity/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/app/(auth)/auth';

// Typer for å forbedre type safety
type Message = {
  role: string;
  content: string;
};

type PineconeMatch = {
  id: string;
  score: number;
  metadata?: {
    title?: string;
    body?: string;
  };
};

type SanityArticle = {
  _id: string;
  title: string;
  body: string;
  score?: number;
  metadata?: any;
};

const embeddingCache = new Map<string, number[]>();


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId: clientConversationId } = body;

    console.log('message', message);

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Ingen melding ble gitt' }, { status: 400 });
    }

    const session = await auth();
    const userEmail = session?.user?.email;

    // Opprett eller hent samtale
    const { conversationId } = await handleConversation(
      clientConversationId, 
      message, 
      userEmail
    );

    // Lagre meldingen (brukerens melding)
    await saveMessages([
      { role: 'user', content: message }
    ], conversationId, userEmail);

    // Start streaming AI-svar og hent artikler parallelt
    return streamResponse(
      [ { role: 'user', content: message } ],
      conversationId,
      message // send med som query til pinecone
    );
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Noe gikk galt ved prosessering av forespørselen' },
      { status: 500 }
    );
  }
}

async function handleConversation(
  clientConversationId: string | undefined, 
  lastUserMsg: string, 
  userEmail: string | undefined | null
) {
  if (!clientConversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        title: lastUserMsg?.slice(0, 40) || 'Ny samtale',
        user: {
          connect: {
            email: userEmail!
          }
        }
      },
    });
    return { conversationId: conversation.id };
  } else {
    const conversation = await prisma.conversation.findUnique({ 
      where: { 
        id: clientConversationId,
        ...(userEmail ? { userEmail } : {})
      } 
    });
    
    if (!conversation && userEmail) {
      throw new Error('Uautorisert tilgang til samtale');
    }
    
    return { conversationId: clientConversationId, isNewConversation: false };
  }
}

/**
 * Lagrer meldinger i batch for bedre ytelse
 */
async function saveMessages(
  messages: Message[], 
  conversationId: string, 
  userEmail: string | undefined | null
) {
  // Prepare message objects
  const messageObjects = messages.map(m => ({
    conversationId,
    role: m.role,
    content: m.content,
    ...(userEmail && m.role === 'user' ? { user: { connect: { email: userEmail } } } : {}),
  }));

  // Find existing messages to avoid duplicates (in one query)
  const existingMessages = await prisma.message.findMany({
    where: {
      conversationId,
      OR: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    },
    select: { role: true, content: true }
  });

  // Filter out existing messages
  const messagesToCreate = messageObjects.filter(nm => 
    !existingMessages.some(em => em.role === nm.role && em.content === nm.content)
  );
  
  // Batch create if we have new messages
  if (messagesToCreate.length > 0) {
    try {
      await prisma.$transaction(
        messagesToCreate.map(msg => {
          const { user, ...messageData } = msg;
          return prisma.message.create({
            data: {
              ...messageData,
            }
          });
        })
      );
    } catch (error) {
      console.error('Error saving messages:', error);
      // Continue execution even if saving fails - don't block the chat response
    }
  }
}

/**
 * Henter embedding og matcher fra Pinecone med caching
 */
async function getPineconeMatches(query: string): Promise<{
  matches: PineconeMatch[],
  sanityPromise: Promise<SanityArticle[]> | undefined
}> {
  if (!query) {
    return { matches: [], sanityPromise: undefined };
  }

  let embedding: number[];
  if (embeddingCache.has(query)) {
    embedding = embeddingCache.get(query)!;
  } else {
    embedding = await getEmbedding(query);
    embeddingCache.set(query, embedding);
    
    if (embeddingCache.size > 1000) {
      const oldestKey = embeddingCache.keys().next().value;
      if (typeof oldestKey === 'string') {  
        embeddingCache.delete(oldestKey);
      }
    }
  }

  const pineconeMatches = await queryPinecone(embedding, 3);
  
  let sanityPromise: Promise<SanityArticle[]> | undefined = undefined;
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
    ).catch(error => {
      console.error('Error fetching from Sanity:', error);
      return [];
    });
  }

  return {
    matches: pineconeMatches as PineconeMatch[],
    sanityPromise
  };
}

/**
 * Setter opp streaming respons
 */
function streamResponse(
  messages: Message[],
  conversationId: string,
  pineconeQuery: string
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const timeout = setTimeout(() => {
        controller.enqueue(encoder.encode(`event: error\ndata: {"message": "Tidsavbrudd ved henting av data"}\n\n`));
        controller.close();
      }, 30000);
      let aiDone = false;
      let articlesDone = false;
      try {
        // Send samtale-ID først
        controller.enqueue(encoder.encode(`event: conversationId\ndata: ${JSON.stringify(conversationId)}\n\n`));

        // Start AI-stream parallelt
        const aiStreamPromise = (async () => {
          if (typeof chatWithOpenAI === 'function') {
            // Start AI-streamen umiddelbart uten pineconeMatches
           const aiStream = await chatWithOpenAI(messages);
            const reader = aiStream.getReader();
            let doneReading = false;
            const textDecoder = new TextDecoder();
            while (!doneReading) {
              const { value, done } = await reader.read();
              doneReading = done;
              if (value) {
                controller.enqueue(encoder.encode(`event: content\ndata: ${JSON.stringify(textDecoder.decode(value))}\n\n`));
              }
            }
          }
          aiDone = true;
          if (articlesDone) {
            clearTimeout(timeout);
            controller.close();
          }
        })();

        // Hent pinecone/sanity parallelt og send artikler-event når de er klare
        const articlesPromise = (async () => {
          try {
            const pineconeData = await getPineconeMatches(pineconeQuery);
            if (pineconeData.sanityPromise) {
              const arts = await pineconeData.sanityPromise;
              controller.enqueue(encoder.encode(`event: articles\ndata: ${JSON.stringify(arts)}\n\n`));
            }
          } catch (error) {
            console.error('Error waiting for Sanity data:', error);
          }
          articlesDone = true;
          if (aiDone) {
            clearTimeout(timeout);
            controller.close();
          }
        })();

        await Promise.all([aiStreamPromise, articlesPromise]);
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.enqueue(encoder.encode(`event: error\ndata: {"message": "En feil oppstod under prosessering"}\n\n`));
        clearTimeout(timeout);
        controller.close();
      }
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