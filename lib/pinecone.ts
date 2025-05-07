import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX!);

export async function queryPinecone(embedding: number[], topK: number = 5) {
  // Pinecone v5+ query
  const queryRequest = {
    vector: embedding,
    topK,
    includeMetadata: true,
  };
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  let matches = result.matches || [];
  if (matches) {
    console.log('Pinecone relevans for spørring:');
    matches.forEach((m: any, i: number) => {
      console.log(`#${i+1}: score=${m.score?.toFixed(4) ?? '?'} title="${m.metadata?.title ?? ''}" id=${m.id}`);
    });
  }
  // Filtrer ut matches med lav relevans (score < 0.75)
  matches = matches.filter((m: any) => (typeof m.score === 'number' ? m.score >= 0.85 : true));
  // Legg score inn i metadata hvis ikke allerede
  matches = matches.map((m: any) => ({ ...m, metadata: { ...m.metadata, score: m.score } }));
  return matches;
}
