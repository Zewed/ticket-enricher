# ticket-enricher

Node/TypeScript service to enrich Linear tickets with AI-generated context.

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

- `npm run dev`: run local server with auto-reload
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run the compiled build
- `npm run typecheck`: run strict TypeScript checks

## Endpoints

- `GET /health`: service health status
- `POST /webhooks/linear`: Linear webhook endpoint (optional signature verification)

## Next Step

- Connect Linear API calls
- Add RAG pipeline (codebase + historical tickets)
- Generate an enriched draft and post it as a comment
