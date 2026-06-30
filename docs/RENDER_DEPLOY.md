# Deploiement Render

Cette application se deploie sur Render comme un seul Web Service Node.js:

- le frontend React/Vite est compile dans `artifacts/homies-erp/dist/public`;
- l'API Express sert aussi les fichiers statiques du frontend;
- les appels `/api/*` restent sur le meme domaine.

## Option recommandee: Blueprint

1. Poussez le depot sur GitHub ou GitLab.
2. Dans Render, cliquez sur **New > Blueprint**.
3. Selectionnez ce depot. Render detectera `render.yaml`.
4. Quand Render demande `SUPABASE_DATABASE_URL`, collez l'URL Postgres Supabase reelle.
5. Lancez le deploy.

Le Blueprint utilise:

- Build Command: `corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm run build`
- Start Command: `pnpm run start`
- Health Check Path: `/api/healthz`
- Region: `frankfurt`

## Option manuelle: Web Service

Dans Render, creez **New > Web Service**, connectez le depot, puis configurez:

- Runtime: `Node`
- Build Command: `corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm run build`
- Start Command: `pnpm run start`
- Health Check Path: `/api/healthz`

Variables d'environnement:

```env
NODE_VERSION=24.17.0
NODE_ENV=production
BASE_PATH=/
SESSION_STORE=memory
SESSION_SECRET=une-longue-valeur-aleatoire
SUPABASE_DATABASE_URL=postgresql://postgres.PROJECT_REF:MOT_DE_PASSE@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Ne mettez pas `PORT`: Render le fournit automatiquement. Ne mettez pas `API_PROXY_TARGET` en production.

## Base de donnees

Avant le premier login, assurez-vous que le schema existe dans Supabase:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run create-admin
```

Ces commandes utilisent `SUPABASE_DATABASE_URL` ou `DATABASE_URL` depuis votre environnement local.
