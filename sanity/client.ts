import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@sanity/client';


const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: '2023-05-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export { sanityClient };