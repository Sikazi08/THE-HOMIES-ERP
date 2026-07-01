# Deploiement Render

Cette application peut maintenant se deployer entierement sur Render avec un Blueprint:

- un Web Service Node.js pour l'API Express et le frontend React/Vite;
- une base Supabase Postgres fournie via variable d'environnement Render;
- `SUPABASE_DATABASE_URL` configuree dans Render, sans l'ecrire dans Git;
- le schema de base de donnees pousse avant le demarrage;
- un utilisateur admin cree automatiquement au premier deploy.

## Deploiement recommande

Option directe: ouvrez ce lien Render et suivez l'assistant:

https://render.com/deploy?repo=https://github.com/Sikazi08/THE-HOMIES-ERP

Option manuelle:

1. Poussez le depot sur GitHub ou GitLab.
2. Dans Render, cliquez sur **New > Blueprint**.
3. Selectionnez ce depot.
4. Render detecte `render.yaml`.
5. Ajoutez la variable secrete `SUPABASE_DATABASE_URL` avec l'URL Postgres Supabase.
6. Cliquez sur **Apply** et attendez la fin du premier deploy.

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
- Build Command: `corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile --prod=false && pnpm run build`
- Pre-Deploy Command: `pnpm run render:init-db`
- Start Command: `pnpm run start`
- Health Check Path: `/api/healthz`

## Variables Render

Render configure les valeurs non secretes depuis `render.yaml`. La valeur de `SUPABASE_DATABASE_URL` doit etre ajoutee dans le Dashboard Render:

```env
NODE_VERSION=24.17.0
NODE_ENV=production
BASE_PATH=/
SESSION_STORE=memory
SESSION_SECRET=<genere par Render>
SUPABASE_DATABASE_URL=<URL Postgres Supabase>
```

Ne mettez pas `PORT`: Render le fournit automatiquement. Ne mettez pas `API_PROXY_TARGET` en production. Ne remplacez pas `SUPABASE_DATABASE_URL` par une base Render Postgres si vous voulez garder les utilisateurs et donnees Supabase.

Pour verifier la base utilisee apres deploy:

```text
https://my-erp-a5ub.onrender.com/api/healthz/db
```

La reponse doit contenir:

```json
{"database":{"provider":"supabase","source":"SUPABASE_DATABASE_URL"}}
```

Sur un Blueprint Render deja existant, ajoutez `SUPABASE_DATABASE_URL` manuellement dans **Environment**. Render ne redemande pas les variables `sync: false` quand on met a jour un Blueprint existant.

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

Le Blueprint utilise un plan web payant minimal. Pour un simple test, vous pouvez remplacer:

```yaml
plan: starter
```

par:

```yaml
plan: free
```
