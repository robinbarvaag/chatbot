# Moderne Chatbot med Next.js, shadcn/ui, Sanity og OpenAI

## Stack
- Next.js 15 (app-router)
- React 19
- shadcn/ui
- Sanity CMS (med Studio embed)
- OpenAI API

## Kom i gang

1. Installer avhengigheter:
   ```bash
   npm install
   ```
2. Start utviklingsserver:
   ```bash
   npm run dev
   ```

## Strukturelle prinsipper
- All businesslogikk i `/lib`
- API-ruter i `/app/api`
- UI-komponenter i `/components`
- Sanity Studio embed i `/app/sanity/studio.tsx`
- Følg regler i `rules.md` for videre utvikling

## Miljøvariabler
- `OPENAI_API_KEY`
- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_TOKEN`
