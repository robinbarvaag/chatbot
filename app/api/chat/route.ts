import { NextRequest } from 'next/server';
import { chatWithOpenAI, getEmbedding } from '../../../lib/openai';
import { queryPinecone } from '../../../lib/pinecone';
import { sanityClient } from '../../../sanity/client';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  // Finn brukerens siste spørsmål
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content;

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