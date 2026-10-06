# Crisp chat

## Limitations

1. To keep it simpler while remaining in-scope: Multiple operators for a single chat isn't supported. When an operator opens a chat room, it claims the room and it isn't available to other operators anymore. This would not be ok for production, but given that the operator UI is already beyond the requirements, I thought this was a good enough place to avoid further scope creep.
2. Any signed-in user is considered an operator. In production this would require proper user roles management.
3. Orphaned OPFS files can be left behind after a crash, interrupted cleanup, or cleared IndexedDB metadata. This exercise deliberately has no startup or periodic cleanup sweep. Local copies expire after seven days without transfer activity or a download, but expiry alone does not reclaim storage: remove the local file explicitly, or explicitly restart an expired partial transfer. Clearing this site's browser storage also removes local files and checkpoints.
4. Resume requires the same browser profile and origin for the receiver's partial file. The sender must reselect the original file after a reload; a full content fingerprint rejects a different file. Clearing browser storage, browser eviction, and private-browsing limits can make a partial or completed file unavailable. Chat history remains in PostgreSQL.
5. Connectivity currently uses Google's STUN server without TURN. Some networks cannot establish a direct P2P connection. Live transfer coordination runs in one server process; multiple server instances would need shared routing and coordination.
6. Receiving requires HTTPS (or localhost), OPFS, IndexedDB, dedicated workers, and OPFS synchronous access handles. Unsupported environments show a storage error; no alternative large-file download backend is implemented. Real 2GB receive/download and the full desktop/mobile browser matrix still need manual validation.

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

## Coturn setup and testing

Both Compose files configure coturn through `command` (overriding the image CMD), with `network_mode: host` on Linux. Host networking needs no `ports` entries. Coturn listens on TCP/UDP 3478 and uses UDP 49160–49200 for relay allocations; `TURN_PORT`, `TURN_MIN_PORT`, and `TURN_MAX_PORT` can override these. Each concurrent allocation consumes relay capacity, so increase the range if needed. Multiple deployments on the same host need distinct listener ports and non-overlapping relay ranges.

Local Compose binds coturn's listener and relay sockets to `127.0.0.1` and permits loopback peers for same-machine tests only. Start just coturn with:

```bash
docker compose up -d turn
docker compose logs -f turn
```

Both files use coturn's shared-secret authentication for expiring credentials. The local default is `local-turn-secret`; override `TURN_SECRET` in `.env` if desired. The secret stays on the server. A credential issuer must produce a username such as `<expiry-unix-seconds>:<user-id>` and a credential equal to `base64(HMAC-SHA1(TURN_SECRET, username))`; browsers receive only that username and credential.

For a local browser test, generate a one-hour credential in your terminal (Node 24 loads `.env`):

```bash
node --env-file=.env --input-type=module <<'JS'
import { createHmac } from 'node:crypto';
const username = `${Math.floor(Date.now() / 1000) + 3600}:local-test`;
const credential = createHmac('sha1', process.env.TURN_SECRET || 'local-turn-secret')
  .update(username).digest('base64');
console.log(JSON.stringify({ username, credential }, null, 2));
JS
```

Use those values in the DevTools console of your local app. Run once with UDP and again with `transport=tcp` to check both client transports:

```js
const peer = new RTCPeerConnection({
  iceTransportPolicy: "relay",
  iceServers: [{
    urls: "turn:127.0.0.1:3478?transport=udp",
    username: "PASTE_USERNAME",
    credential: "PASTE_CREDENTIAL",
  }],
});
peer.onicecandidate = ({ candidate }) => console.log(candidate?.type, candidate?.candidate);
peer.onicecandidateerror = event => console.error(event);
peer.createDataChannel("turn-test");
await peer.setLocalDescription(await peer.createOffer());
// After inspecting the gathered candidates:
// peer.close();
```

A `relay` candidate confirms authentication and allocation. A full data-channel test requires two peers to exchange offers, answers, and ICE candidates with `iceTransportPolicy: "relay"`; verify the selected candidate pair through `getStats()` or browser WebRTC diagnostics. Local tests are useful for credentials and relay behavior, but testing with peers on separate networks against the deployed server is still needed to check public reachability and firewall/NAT behavior.

The app currently configures only Google STUN in `app/lib/file-transfer/rtc-peer.ts`. Starting coturn alone does not enable TURN for file transfers: the next integration step is a server-side credential endpoint and adding the returned TURN URLs/credentials to each peer's `iceServers`. Force relay on both peers during testing, then restore the default `all` policy so direct connections are preferred.

For `docker-compose.dockiy.yml`, set these variables in the deployment's Compose environment (the shell or Compose `--env-file`; the app's `deploy.env` alone does not supply Compose interpolation):

- `TURN_SECRET`: a separate random secret per environment, generated with `openssl rand -hex 32`.
- `TURN_REALM`: a stable realm such as `turn.example.com`.
- `TURN_EXTERNAL_IP`: the server's public IP, or `PUBLIC_IP/PRIVATE_IP` when behind NAT. Forward the listener and relay ports without changing relay port numbers.

Point the TURN hostname's DNS directly at the server and allow TCP/UDP 3478 plus UDP 49160–49200 in the host/cloud firewall. The existing Traefik HTTP router does not carry TURN traffic. Production blocks private and link-local peer destinations and keeps loopback peers disabled. Both configurations currently disable TLS/DTLS; `turn:` works over UDP/TCP. For `turns:` on 5349 (or a dedicated 443 endpoint for restrictive networks), mount a valid certificate/key, enable TLS and configure its listener and firewall separately. `--no-tcp-relay` disables RFC 6062 TCP peer allocations; TURN-over-TCP clients remain supported with UDP relay allocations, as used by WebRTC.

## How to try it out?

1. Sign up to create an operator account. Go to `/operator` to see the dashboard.
2. Send a message from the homepage's chat widget as a logged out user. This will create a room for the operator to join.
3. Join the room from the operator side and start chatting.

## File transfers

Open the operator and visitor conversations in separate browser profiles. Attach one or multiple files, then choose **Receive file** on the recipient's card. Both sides may send files at the same time. Three accepted transfers can run concurrently per room; additional accepted files wait for a slot. The server limits pending live offers to 32 per room. Closing the widget or switching conversations keeps room sessions and transfers alive. Background completion and interruption notifications lead back to the conversation.

Attachments can be selected while the chat is connecting or reconnecting. Source verification continues locally through connection drops; prepared files show **Waiting for connection…** and are offered automatically once reconnect history has loaded. Retries keep the same transfer ID. Files that have not reached the server can be cancelled locally. Selected source files remain in memory across reconnects and chat closure; reloading the page loses any offer that has not yet been saved by the server.

Network interruption preserves received checkpoints. Reopening both conversations restores file cards and resumes eligible transfers automatically when local resources are available. After a sender reload, use **Reselect original file**. A receiver with no local checkpoint must explicitly choose **Resume transfer** to start receiving again. Mobile cellular connections require confirmation; mobile devices without reliable network-type detection also receive a confirmation prompt.

Completed files remain available across reloads in the receiving browser. **Download** exports the local copy and refreshes its seven-day retention period. **Remove local file** releases browser storage while preserving the chat-history card. An expired partial can be discarded and received again with **Restart receiving**. Cancellation and decline remove partial data when cleanup succeeds, and pending offline cancellation is saved for replay before any resume.

## Transfer architecture

- PostgreSQL stores one `chat_file_transfer` row per file card: room and participants, file metadata and fingerprint, lifecycle status, timestamps, and a monotonically increasing version. Offers and lifecycle changes are saved before notification. Retried offers use the same UUID. Reconnecting loads text and file history, merging file records by version.
- WebSockets carry consent, readiness, lifecycle changes, and WebRTC signaling. Each transfer attempt gets a new ID so delayed signaling cannot affect a resumed connection. Both ends advertise readiness; the receiver supplies the restart offset. Only live sockets and the concurrency queue remain in server memory.
- File bytes use native ordered WebRTC data channels. The sender reads 16KiB chunks and waits for a receiver acknowledgement after each 256KiB batch. Acknowledgements follow OPFS flush and IndexedDB transaction completion, bounding unacknowledged data and queued writes.
- A dedicated worker writes directly into one OPFS file per user/room/transfer. IndexedDB records the committed offset and a hash of the checkpoint tail. Reopening validates the checkpoint and truncates any uncommitted tail. A synchronous access handle locks the destination against another tab's writer. Browser-storage quota estimates also account for outstanding writes reserved by other retained room sessions in this app; actual write failures remain authoritative.
- Content identity uses SHA-256 hashes of 4MiB blocks, followed by a SHA-256 hash of the ordered digest manifest and file size. Source verification is serialized to bound memory. The receiver verifies the full file before confirming receipt. File contents never enter the server database or an in-memory array of all received chunks.

## Validation

`pnpm lint-full` and `pnpm build` pass. Inline checks covered transfer offsets and checkpoint-before-ACK ordering, full-content fingerprints, worker flush/checkpoint ordering, recovery and tail truncation, damaged checkpoints, fresh attempt IDs, queued concurrency, both-end reconnect, sender reselection, completion reconciliation, local removal preserving history, cancellation during preparation, offline cancellation replay, mobile-consent rejection, lazy retention, retained room sessions, and background pause notifications. The running operator inbox/conversation also loaded successfully without browser warnings or errors. No upload-test scripts were added.

Manual checks still required: transfer and export a real 2GB file while observing browser memory; interrupt and reload each participant and both participants; receive concurrent large files in both directions; test quota exhaustion, cellular consent, and duplicate tabs; exercise target Chrome/Edge, Firefox, Safari, iOS, and Android browsers and separate networks.
