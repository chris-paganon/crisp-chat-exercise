# Crisp chat

## Stack

- Nuxt + tailwindcss: frontend, backend and websockets.
- PostgreSQL: chat history and file metadata history.
- IndexedDB + OPFS: local browser file storage for partial transfer resume.
- BetterAuth: user authentication (email, google oauth and anonymous users for visitor chat widget sessions).
- webRTC: file transfer between users. Coordinated through websockets.
- coturn: TURN server for file transfer accross networks.

## Implemented

- Visitor chat widget.
- Operator chat UI & dashboard.
- File transfer with partial resume support after closing the tab/browser.
- File transfer continue while both users are on the web page. Both users can navigate on other pages and the transfer will continue.

## Limitations

1. To keep it simpler while remaining in-scope: Multiple operators for a single chat isn't supported. When an operator opens a chat room, it claims the room and it isn't available to other operators anymore. This would not be ok for production, but given that the operator UI is already beyond the requirements, I thought this was a good enough place to avoid further scope creep.
2. Any signed-in user is considered an operator. In production this would require proper user roles management.
3. Orphaned OPFS files can be left behind after a crash, interrupted cleanup, or cleared IndexedDB metadata. Clear this the browser storage to remove local files and checkpoints.
4. File download depends on OPFS which is subject to a user's browser storage capacity/quota. In production we would probably add a fallback that doesn't support robust partial resume but doesn't require browser storage.
5. File offers require a room already claimed by an operator. Offers can be saved while the recipient is offline, but transferring bytes requires both participants online. Reloading the sender's page requires reselecting the original file.
6. No notifications or incoming message status was added in the operator's dashboard. I considered it out-of-scope for the exercise. As I understand, the operator dashboard is already more than was excpected.

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
4. Exchnage files between the operator and the visitor. Close tabs, cancel, resume, etc.
