import { NextRequest, NextResponse } from 'next/server';
import { chatWithOpenAI } from '../../../lib/openai';
import { fetchSanityContent } from '../../../lib/sanity';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  let cmsData = null;
  if (messages[messages.length-1]?.content?.toLowerCase().includes('cms')) {
    cmsData = await fetchSanityContent();
  }
  const stream = await chatWithOpenAI(messages, cmsData);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
