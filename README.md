<p align="center">
  <img src="app/assets/images/logo-square.png" alt="DockIY logo" width="160" />
</p>

# DockIY Nuxt Better Auth template

A full-stack [Nuxt](https://nuxt.com/) starter with [Better Auth](https://better-auth.com/),
PostgreSQL, and [Drizzle](https://orm.drizzle.team/), deployed with
[DockIY](https://dockiy.com).

## Docs for this template

- [Website](https://dockiy.com/templates/nuxt-betterauth)
- [Demo](https://nuxt-betterauth.dockiy.com)
- [Codeberg](https://codeberg.org/chris-paganon/dockiy-nuxt-betterauth)

## Requirements

Install [Node.js 24+](https://nodejs.org/en/download/),
[pnpm 11+](https://pnpm.io/installation), [Docker Engine](https://docs.docker.com/engine/install/),
[Docker Compose](https://docs.docker.com/compose/install/),
and the [DockIY CLI](https://dockiy.com/guide/installation). Install
[SOPS](https://getsops.io/docs/installation/) and [age](https://github.com/FiloSottile/age#installation)
for encrypted environment files.

## Local development

Create a project with `dockiy app init nuxt-betterauth my-app`, or clone this repo.
Copy `.env.example` to `.env` and set:

- `NUXT_BETTER_AUTH_SECRET`: output of `openssl rand -base64 32`.
- `NUXT_BREVO_*`: API key and verified sender for email signup/reset.
- `NUXT_BETTER_AUTH_URL`: `http://localhost:3000` locally.

```bash
cp .env.example .env
# Edit .env, then:
docker compose up -d
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Nuxt and Drizzle load `.env`. The example connects to PostgreSQL at
`localhost:5432`; if you change `POSTGRES_DOCKER_PORT`, update the port in
`NUXT_DATABASE_URL` too. pgAdmin: `http://localhost:82`, login `admin@m.com` /
`admin`, database host `db:5432`, credentials from `POSTGRES_*`.

### Encrypted local values

Create `.enc.local.env` with your own [SOPS configuration](https://dockiy.com/guide/installation#sops-identity),
then wrap the normal commands:

```bash
sops exec-env .enc.local.env 'docker compose up -d'
sops exec-env .enc.local.env 'pnpm db:migrate'
sops exec-env .enc.local.env 'pnpm dev'
```

You can put the wrapper in `package.json`, e.g.
`"dev": "sops exec-env .enc.local.env 'nuxt dev'"`. Keep plaintext env files
uncommitted; replace the template's encrypted files with your own.

## Staging and production

Set the app name and environment hosts in `dockiy.yml`. Use `sops edit` to
create `.enc.staging.env` and `.enc.production.env` from the example's keys:

| Setting | Staging / production |
| --- | --- |
| `POSTGRES_*` credentials, `NUXT_BETTER_AUTH_SECRET` | Separate values per environment |
| `NUXT_DATABASE_URL` | `postgresql://USER:PASSWORD@db:5432/DATABASE`; URL-encode credentials |
| `POSTGRES_DOCKER_PORT` | Unused, distinct VPS ports, e.g. `5434` / `5435` |
| `NUXT_BETTER_AUTH_URL` | Public HTTPS origin matching that environment's host |
| `NUXT_BREVO_*` | Working email credentials and sender |

The **NUXT_DATABASE_URL db port is always 5432**. It is the internal port from within the container. The POSTGRES_DOCKER_PORT is the port exposed to the host machine so you can connect to the database with SSH from your local machine.

DockIY forwards the selected file's variables and applies committed migrations.
After schema edits: `pnpm db:generate`, review/commit the SQL, then
`pnpm db:migrate` locally. Deploy with `dockiy app deploy staging` or
`dockiy app deploy production --version v1.0.0`.

## Authentication

Email/password and google auth are preconfigured.

- Use the auth session on the client: import `authClient` from `@/lib/auth-client`; read the session with
  `await authClient.useSession(useFetch)` (https://better-auth.com/docs/integrations/nuxt#use-the-session). 
- Auth gate pages: `definePageMeta({ middleware: "auth" })` (https://better-auth.com/docs/integrations/nuxt#protect-pages).
- APIs: `const user = await requireUser(event)`, then check resource ownership.

### Google auth setup

1. In [Google Cloud Console](https://console.cloud.google.com/auth/overview), select a project and configure **Google Auth Platform → Branding / Audience**. For external testing, add your test users.
2. Under **Clients**, create a **Web application** OAuth client. Add `http://localhost:3000/api/auth/callback/google` and each deployed origin plus `/api/auth/callback/google` to **Authorized redirect URIs**.
3. Set `NUXT_GOOGLE_CLIENT_ID` and `NUXT_GOOGLE_CLIENT_SECRET` in the environment's dotenv file. `NUXT_BETTER_AUTH_URL` must match its origin exactly. Restart locally or redeploy, then use **Continue with Google**.

See the [template guide](https://dockiy.com/templates/nuxt-betterauth) for auth
examples, Google launch settings, and deployment prerequisites.
