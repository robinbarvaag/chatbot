'use client'

import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import article from './schemas/article';

export default defineConfig({
  basePath: '/sanity',
  projectId: "7wtbhsng",
  dataset: "production",
  title: 'Chatbot CMS',
  plugins: [deskTool()],
  schema: {
    types: [article],
  },
});
