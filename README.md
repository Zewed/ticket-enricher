# ticket-enricher

Service Node/TypeScript pour enrichir des tickets Linear avec du contexte IA.

## Démarrage

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

- `npm run dev`: serveur local avec reload
- `npm run build`: compile TypeScript vers `dist/`
- `npm run start`: lance la version compilée
- `npm run typecheck`: vérification TypeScript stricte

## Endpoints

- `GET /health`: état du service
- `POST /webhooks/linear`: endpoint webhook Linear (signature optionnelle)

## Prochaine étape

- Brancher les appels API Linear
- Ajouter pipeline RAG (codebase + tickets historiques)
- Générer un draft enrichi puis le poster en commentaire
