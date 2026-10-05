# Crisp chat

## Limitations

1. To keep it simpler while remaining in-scope: Multiple operators for a single chat isn't supported. When an operator opens a chat room, it claims the room and it isn't available to other operators anymore. This would not be ok for production, but given that the operator UI is already beyond the requirements, I thought this was a good enough place to avoid further scope creep.
2. Any signed-in user is considered an operator. In production this would require proper user roles management.

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

## How to try it out?

1. Sign up to create an operator account. Go to `/operator` to see the dashboard.
2. Send a message from the homepage's chat widget as a logged out user. This will create a room for the operator to join.
3. Join the room from the operator side and start chatting.
