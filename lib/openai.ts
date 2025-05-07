import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Returnerer embedding-vektor for gitt tekst via OpenAI API.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return res.data[0].embedding;
}

function getOrderCount(userId: string) {
  return { count: 7 };
}

function getOrderTotal(userId: string) {
  return { total: 100 };
}

function getOrderDetails(userId: string) {
  return [
    {
      ordreid: "ORDRE123",
      ordrelinjer: [
        {
          produktid: "PRODUKT123",
          antall: 2,
          pris: 100
        }
      ]
    },
    {
      ordreid: "ORDRE456",
      ordrelinjer: [
        {
          produktid: "PRODUKT456",
          antall: 1,
          pris: 200
        }
      ]
    }
  ];
}

export async function chatWithOpenAI(messages: { role: string, content: string }[], cmsData: any = null) {
  // Konverter meldinger til riktig format
  const formattedMessages = [
    { role: 'system', content: 'Du er en hjelpsom chatbot for en nettside.' } as const,
    ...messages.map(m => {
      if (m.role === 'user') {
        return { role: 'user', content: m.content } as const;
      } else if (m.role === 'assistant') {
        return { role: 'assistant', content: m.content } as const;
      } else if (m.role === 'system') {
        return { role: 'system', content: m.content } as const;
      }
      return { role: 'user', content: m.content } as const;
    })
  ];

  // Legg til CMS-data i system message om nødvendig
  if (cmsData) {
    formattedMessages[0] = { 
      role: 'system', 
      content: formattedMessages[0].content + `\nRelevant CMS info: ${JSON.stringify(cmsData)}` 
    } as const;
  }

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "getOrderCount",
        description: "Hent antall ordre for en bruker",
        parameters: {
          type: "object",
          properties: {
            userId: { type: "string", description: "Brukerens ID" }
          },
          required: ["userId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "getOrderTotal",
        description: "Hent totalpris for en ordre",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string", description: "Ordrenes ID" }
          },
          required: ["orderId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "getOrderDetails",
        description: "Hent detaljer for en ordre",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string", description: "Ordrenes ID" }
          },
          required: ["orderId"]
        }
      }
    }
  ];

  // 1. Første kall til OpenAI for å se om den vil bruke tool
  const initialResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: formattedMessages,
    tools: tools,
    tool_choice: "auto"
  });

  const initialMessage = initialResponse.choices[0].message;

  // 2. Hvis OpenAI vil kalle funksjonen vår
  if (initialMessage.tool_calls && initialMessage.tool_calls.length > 0) {
    const toolCall = initialMessage.tool_calls[0];
    
    if (toolCall.function && toolCall.function.name === "getOrderCount") {
      // Parse argumentene
      const args = JSON.parse(toolCall.function.arguments);
      const userId = args.userId || "dummy";
      
      // Hent data
      const orderData = getOrderCount(userId);

      // 3. Send funksjonssvaret tilbake til OpenAI for naturlig språk
      const finalMessages = [
        ...formattedMessages,
        initialMessage,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(orderData)
        }
      ];

      // Stream responsen
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: finalMessages,
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

    if (toolCall.function && toolCall.function.name === "getOrderTotal") {
      // Parse argumentene
      const args = JSON.parse(toolCall.function.arguments);
      const orderId = args.orderId || "dummy";
      
      // Hent data
      const orderData = getOrderTotal(orderId);

      // 3. Send funksjonssvaret tilbake til OpenAI for naturlig språk
      const finalMessages = [
        ...formattedMessages,
        initialMessage,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(orderData)
        }
      ];

      // Stream responsen
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: finalMessages,
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

    if (toolCall.function && toolCall.function.name === "getOrderDetails") {
      // Parse argumentene
      const args = JSON.parse(toolCall.function.arguments);
      const orderId = args.orderId || "dummy";
      
      // Hent data
      const orderData = getOrderDetails(orderId);

      // 3. Send funksjonssvaret tilbake til OpenAI for naturlig språk
      const finalMessages = [
        ...formattedMessages,
        initialMessage,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(orderData)
        }
      ];

      // Stream responsen
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: finalMessages,
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

  }

  // 4. Hvis ikke tool_calls, svar direkte med streaming
  // Start stream direkte fra første respons (siden vi allerede har gjort et kall)
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: formattedMessages,
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