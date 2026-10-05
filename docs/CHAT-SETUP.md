# Chat room setup

This phase implements visitor-created rooms and operator claiming. Text/WebSocket messages and file transfers remain disabled.

## Setup and use

1. Configure `NUXT_DATABASE_URL`, `NUXT_BETTER_AUTH_SECRET`, and `NUXT_BETTER_AUTH_URL` using the existing template setup. The auth URL must match the browser origin, including the port, for room mutations.
2. Run `pnpm db:migrate`. The new migrations allow an empty operator slot, enforce one room per visitor, remove the invitation table, and require a visitor. Legacy invitation-only rooms without visitors are removed; joined conversations retain their participants.
3. Open `/` as a visitor and open the support widget. It creates a BetterAuth anonymous session if needed and creates or restores that visitor's room.
4. In a separate browser profile, sign in or create an operator account and open `/operator`. Unclaimed rooms and your claimed rooms appear in the inbox. Opening an unclaimed room joins you as its operator.

Closing/reopening the widget or reloading the homepage keeps the same room while the anonymous session remains valid. There is no new-room button. Clear the site's cookies to start a new anonymous visitor session; the next chat open creates a different room. A signed-in operator can use a private window to test the visitor flow.

## Data and access

- `chat_room`: a required, unique visitor slot and an optional operator slot; participants must be different users.
- `chat_message`: text body, sender, room, creation/read timestamps, and a unique client ID per room/sender for future retry deduplication. No message write endpoint exists yet; future message writes must validate room membership.

Registered users are operators; anonymous users are visitors. Visitor room creation is idempotent, including concurrent requests. Operators see unclaimed rooms and their own claimed rooms. Claiming locks the room inside a transaction, so only one operator can take it. Reopening by that operator is idempotent. Room detail reads require membership, and another operator cannot read or claim an already-claimed room.

The dashboard refreshes the room list every five seconds. The open visitor widget refreshes its room membership every five seconds, showing the operator's name after claiming. These indicate membership, not live connectivity. No WebSocket messaging is implemented.

## Validation

`pnpm typecheck` and ESLint checks passed for the changed files. Local API checks covered concurrent room creation, concurrent operator claims, role/origin/member permissions, operator room visibility, and restoring a visitor's room. The migrations were applied to the local development database, which had no existing rooms.
