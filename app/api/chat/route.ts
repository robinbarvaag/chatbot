import { NextRequest } from 'next/server';
import { chatWithOpenAI, getEmbedding } from '../../../lib/openai';
import { queryPinecone } from '../../../lib/pinecone';
import { sanityClient } from '../../../sanity/client';
import { fetchSanityContent } from '../../../lib/sanity';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  // Finn brukerens siste spørsmål
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content;

  let contextArticles = [];
  if (lastUserMsg) {
    // 1. Lag embedding av brukerens spørsmål
    const embedding = await getEmbedding(lastUserMsg);
    // 2. Søk i Pinecone etter relevante artikler
    const matches = await queryPinecone(embedding, 3);
    // 3. Hent artikler fra Sanity basert på _id fra Pinecone
    const ids = matches.map((m: any) => m.id);
    if (ids.length > 0) {
      const sanityArticles = await sanityClient.fetch(
        `*[_type == "article" && _id in $ids]{_id, title, body}`,
        { ids }
      );
      // Koble sammen Sanity-artikler og Pinecone-score/metadata
      contextArticles = sanityArticles.map((a: any) => {
        const match = matches.find((m: any) => m.id === a._id);
        return {
          ...a,
          score: match?.score,
          metadata: match?.metadata,
        };
      });
    }
  }
  // 4. Send artiklene som kontekst til OpenAI-chatten
  // Nå: Stream svaret fra OpenAI og send artikler først som SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send artikler først
      controller.enqueue(encoder.encode(`event: articles\ndata: ${JSON.stringify(contextArticles)}\n\n`));

      // Bygg systemprompt
      const formattedMessages = [
        { role: 'system', content: 'Du er en hjelpsom chatbot for en nettside.' + (contextArticles.length ? '\nHer er relevante artikler:\n' + contextArticles.map(a => `Tittel: ${a.title}\n${a.body}`).join('\n---\n') : '') },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ];
      // Start OpenAI-stream
      const openaiRes = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: formattedMessages,
        stream: true,
      });
      for await (const chunk of openaiRes) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(`event: content\ndata: ${JSON.stringify(content)}\n\n`));
        }
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

// Hjelpefunksjon for å hente hele svaret fra OpenAI (ikke stream)
import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function getOpenAIAnswer(messages: any[], contextArticles: any[]) {
  const formattedMessages = [
    { role: 'system', content: 'Du er en hjelpsom chatbot for en nettside.' + (contextArticles.length ? '\nHer er relevante artikler:\n' + contextArticles.map(a => `Tittel: ${a.title}\n${a.body}`).join('\n---\n') : '') },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: formattedMessages
  });
  return response.choices[0].message.content;
}

