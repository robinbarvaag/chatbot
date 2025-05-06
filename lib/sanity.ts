import { createClient } from '@sanity/client';

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

export async function fetchSanityContent() {
  // Tilpass denne queryen til ditt innhold
  return await sanity.fetch('*[_type == "article"][0..2]');
}
