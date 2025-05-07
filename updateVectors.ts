import { OpenAI } from 'openai';
import { sanityClient } from './sanity/client';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
  console.error('Mangler nødvendige miljøvariabler (OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX)');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX!);

async function fetchSanityContent() {
  try {
    return await sanityClient.fetch(`*[_type == "article"]{_id, title, "plaintextBody": pt::text(body)}`);
  } catch (e) {
    console.error('Feil ved henting av Sanity-innhold:', e);
    return [];
  }
}

async function updateVectors() {
  const docs = await fetchSanityContent();
  for (const doc of docs) {
    const text = `${doc.title}\n${doc.plaintextBody}`;
    try {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      const embedding = embeddingRes.data[0].embedding;
      await index.upsert([
        {
          id: doc._id,
          values: embedding,
          metadata: { title: doc.title },
        },
      ]);
      console.log(`Oppdatert vektor for: ${doc._id}`);
    } catch (e) {
      console.error(`Feil ved embedding/upsert for ${doc._id}:`, e);
    }
  }
}

updateVectors().then(() => {
  console.log('Vektordatabase oppdatert!');
}).catch(e => {
  console.error('Feil i updateVectors:', e);
});