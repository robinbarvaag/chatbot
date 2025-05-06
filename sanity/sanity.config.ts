'use client'

import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import article from './schemas/article';

export default defineConfig({
  basePath: '/sanity',
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  title: 'Chatbot CMS',
  plugins: [deskTool()],
  schema: {
    types: [article],
  },
});
