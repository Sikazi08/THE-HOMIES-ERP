# Deploiement Render

Cette application peut maintenant se deployer entierement sur Render avec un Blueprint:

- un Web Service Node.js pour l'API Express et le frontend React/Vite;
- une base Render Postgres creee automatiquement;
- `DATABASE_URL` injectee automatiquement depuis la base Render;
- le schema de base de donnees pousse avant le demarrage;
- un utilisateur admin cree automatiquement au premier deploy.

## Deploiement recommande

Option directe: ouvrez ce lien Render et suivez l'assistant:

https://render.com/deploy?repo=https://github.com/Sikazi08/MY-ERP

Option manuelle:

1. Poussez le depot sur GitHub ou GitLab.
2. Dans Render, cliquez sur **New > Blueprint**.
3. Selectionnez ce depot.
4. Render detecte `render.yaml`; cliquez sur **Apply**.
5. Attendez la fin du premier deploy.

Le premier deploy lance `pnpm run render:init-db`, qui execute:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run create-admin
```

Si aucun `ADMIN_PASS` n'est defini, un mot de passe admin aleatoire est genere et affiche une seule fois dans les logs du premier deploy:

```text
Admin user created: admin
Password: ...
```

Connectez-vous avec `admin` et ce mot de passe, puis changez-le depuis l'interface.

## Ce que le Blueprint cree

- Web Service: `the-homies-erp`
- Region: `frankfurt`
- Plan web: `starter`
- Base Postgres: `the-homies-erp-db`
- Plan Postgres: `basic-256mb`
- Build Command: `corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm run build`
- Pre-Deploy Command: `pnpm run render:init-db`
- Start Command: `pnpm run start`
- Health Check Path: `/api/healthz`

## Variables automatiques

Render configure ces variables depuis `render.yaml`:

```env
NODE_VERSION=24.17.0
NODE_ENV=production
BASE_PATH=/
SESSION_STORE=memory
SESSION_SECRET=<genere par Render>
DATABASE_URL=<URL interne Render Postgres>
```

Ne mettez pas `PORT`: Render le fournit automatiquement. Ne mettez pas `API_PROXY_TARGET` en production.

## Choisir le mot de passe admin

Pour choisir le mot de passe avant le premier deploy, ajoutez une variable d'environnement Render:

```env
ADMIN_PASS=votre-mot-de-passe-fort
```

Vous pouvez aussi ajouter:

```env
ADMIN_USER=admin
ADMIN_NAME=Administrateur
```

Si l'utilisateur existe deja, `create-admin` ne le modifie pas.

## Mode gratuit

Le Blueprint utilise des plans payants minimaux pour eviter de perdre la base de donnees. Pour un simple test, vous pouvez remplacer:

```yaml
plan: starter
```

par:

```yaml
plan: free
```

et remplacer le plan Postgres:

```yaml
plan: basic-256mb
```

par:

```yaml
plan: free
```

Attention: les bases Postgres gratuites Render expirent apres 30 jours et ne doivent pas etre utilisees pour la production.
