import { OpenAI } from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return res.data[0].embedding;
  } catch (error: any) {
    console.error("Error getting embedding:", error);
    throw new Error(`OpenAI Embedding API error: ${error.message}`);
  }
}

// Domenefunksjoner
interface OrderCount { count: number }
interface OrderTotal { total: number }
interface OrderLine { 
  produktid: string;
  antall: number;
  pris: number;
}
interface Order {
  ordreid: string;
  ordrelinjer: OrderLine[];
}

function getOrderCount(userId: string): OrderCount {
  return { count: 7 };
}

function getOrderTotal(userId: string): OrderTotal {
  return { total: 100 };
}

function getOrderDetails(userId: string): Order[] {
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

type ToolFunction = (args: any) => any;

const toolFunctions: Record<string, ToolFunction> = {
  getOrderCount: (args) => getOrderCount(args.userId || "dummy"),
  getOrderTotal: (args) => getOrderTotal(args.orderId || "dummy"),
  getOrderDetails: (args) => getOrderDetails(args.orderId || "dummy")
};

const getToolDefinitions = () => [
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

async function createResponseStream(response: any) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      }
    }
  });
}

function formatMessages(messages: { role: string, content: string }[], cmsData: any = null) {
  const systemContent = cmsData 
    ? `Du er en hjelpsom chatbot for en nettside.\nRelevant CMS info: ${JSON.stringify(cmsData)}`
    : 'Du er en hjelpsom chatbot for en nettside.';

  return [
    { role: 'system', content: systemContent, name: 'system' },
    { role: 'system', content: 'Du har tilgang til en rekke tools for å hjelpe brukeren med å finne informasjon.', name: 'system' },
    ...messages.map(m => {
      const validRoles = ['user', 'assistant', 'system'];
      return { 
        role: validRoles.includes(m.role) ? m.role : 'user', 
        content: m.content,
        name: m.role
      };
    })
  ];
}

export async function chatWithOpenAI(messages: { role: string, content: string }[], cmsData: any = null) {
  try {
    const formattedMessages = formatMessages(messages, cmsData);
    const tools = getToolDefinitions();

    const initialResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: formattedMessages.map(m => ({ role: m.role as "function" | "user" | "assistant" | "system", content: m.content, name: m.name })),
      tools: tools,
      tool_choice: "auto"
    });

    const initialMessage = initialResponse.choices[0].message;

    // Sjekk om AI ønsker å bruke verktøy
    if (initialMessage.tool_calls && initialMessage.tool_calls.length > 0) {
      // Håndtere alle verktøykall, ikke bare det første
      const toolResponses = await Promise.all(
        initialMessage.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const toolFunction = toolFunctions[functionName];
          
          if (!toolFunction) {
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Function "${functionName}" not found` })
            };
          }
          
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = toolFunction(args);
            
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            };
          } catch (error: any) {
            console.error(`Error executing function ${functionName}:`, error);
            return {
              role: "tool" as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Error executing function: ${error.message}` })
            };
          }
        })
      );

      const finalMessages = [
        ...formattedMessages.map(m => ({ role: m.role as "function" | "user" | "assistant" | "system", content: m.content, name: m.name })),
        initialMessage,
        ...toolResponses
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: finalMessages,
        stream: true
      });
      
      return createResponseStream(response);
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: formattedMessages.map(m => ({ role: m.role as "function" | "user" | "assistant" | "system", content: m.content, name: m.name })),
      stream: true
    });

    return createResponseStream(response);
    
  } catch (error: any) {
    console.error("Error in chatWithOpenAI:", error);
    throw new Error(`OpenAI Chat API error: ${error.message}`);
  }
}