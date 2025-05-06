# Prosjektregler for Next.js Chatbot

## Teknologi
- Bruk Next.js 15 med app-router
- Bruk React 19
- Bruk shadcn/ui for alle UI-komponenter
- Sanity CMS for alt innhold, bruk Studio embed for admin

## Kodeorganisering
- All ekstern API-logikk i `/lib`
- UI-komponenter i `/components`
- API-ruter i `/app/api`
- Sanity Studio embed i `/app/sanity`
- Miljøvariabler skal brukes for nøkler og sensitive data

## Prompts og AI-integrasjon
- Prompts til OpenAI skal være tydelige og kontekstuelle
- All kommunikasjon med OpenAI går via `/app/api/chat/route.ts`
- For fremtidige agenter: legg til logikk i `/lib/agents` og ruter i `/app/api`

## Utvidelse
- For nye agenter eller funksjoner, dokumenter i denne filen
- Følg eksisterende mappestruktur og konvensjoner

## Testing
- Skriv tester for alle hjelpefunksjoner i `/lib`
- UI-komponenter skal ha enkle enhetstester

## Kodekvalitet
- Bruk Prettier og ESLint
- Skriv beskrivende commit-meldinger
