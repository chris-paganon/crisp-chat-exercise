# Initial chat setup

This phase implements rooms and invitations only. Text/WebSocket messages and file transfers remain disabled.

## Setup and use

1. Configure `NUXT_DATABASE_URL`, `NUXT_BETTER_AUTH_SECRET`, and `NUXT_BETTER_AUTH_URL` using the existing template setup. The auth URL must match the browser origin, including the port, for invite mutations.
2. Run `pnpm db:migrate` to add the chat tables and BetterAuth's `is_anonymous` field.
3. Sign in or create an operator account, then open `/operator`. Existing email verification and optional Google sign-in remain in place.
4. Create a conversation and copy its visitor invite link. Open it in a separate browser profile or private window to join as a visitor.

The homepage at `/` contains the visitor widget. A valid `?invite=…` link opens it automatically, creates or reuses a BetterAuth anonymous session, and claims the room's visitor slot. Reloading that link restores the same visitor's conversation while its session remains valid.

## Data and access

- `chat_room`: fixed operator and visitor slots; participants must be different users.
- `chat_invite`: one active invitation per room, a hashed random token, a 24-hour expiry, and acceptance time. Replacing a link invalidates the previous one. Joined rooms cannot be reinvited.
- `chat_message`: text body, sender, room, creation/read timestamps, and a unique client ID per room/sender for future retry deduplication. No message write endpoint exists yet; future message writes must validate room membership.

Registered users are operators; anonymous users are visitors. Operators can only manage their own rooms. Room reads require membership. Invite acceptance locks the room and invitation inside a transaction, allowing only one visitor to claim the slot. The original guest can reuse an accepted link after expiry; other sessions cannot use it.

The operator dashboard refreshes membership every five seconds. “Visitor joined” describes membership, not live connectivity. Invite tokens remain in browser memory only on the operator side; after a dashboard reload, create a fresh link if it still needs sharing.

## Validation

`pnpm typecheck`, `pnpm lint`, and the production build passed. Migrations were applied to a disposable PostgreSQL database, with invite expiry, replacement, permissions, idempotent rejoin, and concurrent claims checked. Both interfaces were reviewed at desktop and mobile widths, including guest joining and reload restoration. Temporary test services were removed.
