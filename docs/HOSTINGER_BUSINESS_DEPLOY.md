# Deploiement Hostinger Business

Cette application est une app Node.js/Express qui sert aussi le frontend React compile. Le backend demarre avec `server.mjs`, puis charge `artifacts/api-server/dist/index.mjs`.

Reference Hostinger:

- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

## Reglages Hostinger

Dans hPanel, ouvrez le site, puis la section Node.js / Git deployment.

- Repository GitHub: `https://github.com/Sikazi08/okk.git`
- Branche: `main`
- App root: `/`
- Entry file: `server.mjs`
- Build command:

```bash
corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile && pnpm run build
```

- Start command:

```bash
pnpm run start
```

Si Hostinger demande un dossier de sortie, utilisez `artifacts/api-server/dist`. Le frontend compile reste dans `artifacts/homies-erp/dist/public` et il est servi par Express.

## Variables d'environnement

Copiez `hostinger.env.example` dans les variables d'environnement Hostinger et remplacez les placeholders.

Valeurs attendues:

```env
NODE_ENV=production
NODE_VERSION=24.17.0
BASE_PATH=/
SESSION_SECRET=un-long-secret-unique
SUPABASE_DATABASE_URL=postgresql://postgres.PROJECT_REF:VOTRE_MOT_DE_PASSE@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_URL=postgresql://postgres.PROJECT_REF:VOTRE_MOT_DE_PASSE@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Ne mettez pas de guillemets autour des valeurs dans le panel Hostinger. Ne mettez pas `API_PROXY_TARGET` en production. Ne mettez pas `SESSION_STORE=postgres` pour ce deploiement simple.

## Controle apres deploiement

1. Ouvrez l'URL publique Hostinger.
2. Testez la page `/api/healthz`.
3. Essayez la connexion admin.
4. Si la connexion echoue, ouvrez les logs Hostinger et cherchez l'erreur complete juste avant la ligne `POST /api/auth/login`.

Si les logs disent que l'URL de base de donnees est un placeholder, la variable `SUPABASE_DATABASE_URL` n'a pas ete remplacee dans Hostinger.
