# Crisp chat

## Run locally

Requirements: Node.js 24+, pnpm 11+, and Docker with Docker Compose.

1. Install dependencies and create your local environment file:

   ```bash
   pnpm install --frozen-lockfile
   cp .env.example .env
   ```

2. Edit `.env`:

   - Set `NUXT_BETTER_AUTH_SECRET` to the output of `openssl rand -base64 32`.
   - Keep `NUXT_BETTER_AUTH_URL=http://localhost:3000`.
   - To use email signup and password reset, replace the `NUXT_BREVO_*` placeholders with your Brevo API key, verified sender email, and sender name.
   - Google sign-in is optional; leave `NUXT_GOOGLE_CLIENT_ID` and `NUXT_GOOGLE_CLIENT_SECRET` empty unless you configure it.

3. Start PostgreSQL, apply migrations, and run the app:

   ```bash
   docker compose up -d --wait db
   pnpm db:migrate
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The default database settings in `.env.example` work with Docker Compose. If you change the database credentials or `POSTGRES_DOCKER_PORT`, update `NUXT_DATABASE_URL` to match.

## Useful commands

```bash
pnpm typecheck       # Check TypeScript types
pnpm lint            # Check code style
pnpm build           # Build for production
```

To stop the local database, run `docker compose stop db`.
