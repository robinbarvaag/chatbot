import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatWithOpenAI(messages: { role: string, content: string }[], cmsData: any = null) {
  let prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  if (cmsData) {
    prompt += `\nRelevant CMS info: ${JSON.stringify(cmsData)}`;
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Du er en hjelpsom chatbot for en nettside.' },
      ...messages
    ],
    stream: true
  });

  // Returner ReadableStream for bruk i Next.js API route
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    }
  });
  return stream;
}
