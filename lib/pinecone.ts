import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX!);

export async function queryPinecone(embedding: number[], topK: number = 5) {
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  let matches = result.matches || [];
  if (matches) {
    matches.forEach((m: any, i: number) => {
      console.log(`#${i+1}: score=${m.score?.toFixed(4) ?? '?'} title="${m.metadata?.title ?? ''}" id=${m.id}`);
    });
  }
  matches = matches.filter((m: any) => (typeof m.score === 'number' ? m.score >= 0.8 : true));
  matches = matches.map((m: any) => ({ ...m, metadata: { ...m.metadata, score: m.score } }));
  return matches;
}
