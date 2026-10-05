# P2P file transfer interview task

## Goal

Build a polished Vue/TypeScript chat in the existing Nuxt template, with large-file transfers between an operator and a visitor. Keep the core implementation within two days and be able to explain the code and tradeoffs.

## Architecture

Initial setup is implemented: two-person room and text-message schemas; BetterAuth guests; operator inbox; visitor homepage/widget; and operator claiming of visitor-created rooms. See [CHAT-SETUP.md](./CHAT-SETUP.md) for migration and usage. Persisted WebSocket text chat and native WebRTC file transfers are implemented. Room sessions survive conversation component unmounts. PostgreSQL persists file offers/lifecycle, IndexedDB persists local checkpoints and pending cancellation, and OPFS retains received bytes. See [README](../README.md) for the current behavior, validation, and limitations.

- Use the template's database and BetterAuth to persist users, chat sessions, and messages.
- Send text messages through WebSockets: client A ↔ Nuxt server ↔ client B. The server saves messages before acknowledging and forwarding them.
- Use the same WebSocket server for WebRTC signaling and transfer coordination.
- Transfer file bytes through native WebRTC data channels, without external file-transfer libraries.
- Use Google's STUN service initially. Keep TURN configuration available for later integration.
- Write received file chunks progressively into OPFS, with IndexedDB storing transfer metadata and checkpoints. Offer the completed file for download to the device.

## Core implementation

1. **Implemented:** Build text chat with persisted history, send status, retry, and recovery after network loss.
2. **Manual validation pending:** Prove the large-file path early: transfer a 2GB file into OPFS and export it without unbounded memory growth.
3. **Implemented:** Add file offers, receiver consent, progress, cancellation, and multiple simultaneous transfers.
4. **Implemented, browser validation pending:** Handle disconnects, tab closure, insufficient storage, and failed transfers with clear recovery actions.
5. **Implemented:** Build a friendly, responsive interface inspired by Crisp's message view.
6. **Browser matrix pending:** Support major desktop and mobile browsers. Ask for mobile-data consent on cellular connections, with a mobile confirmation fallback when connection detection is unavailable.

## Bonus and fallbacks

- **Implemented:** Resume interrupted transfers after reconnect or reload using saved partial files and checkpoints. Allow the sender to reselect the original file when necessary. Validate all reselected file contents and use a fresh signaling attempt per resume.
- **Pending:** Add coturn to support networks where direct WebRTC connectivity fails.
- **Pending:** Add user-selected file writing or a service-worker download as alternatives when OPFS is unavailable or its quota is insufficient.

## Validation and delivery

- Test chat persistence, retries, reconnects, concurrent transfers, cancellation, and interrupted sessions.
- Verify the complete 2GB receive-and-download path on target desktop and mobile browsers with sufficient storage.
- Test across separate networks and document connectivity limitations without TURN.
- Run `pnpm lint-full` and document setup, architecture, browser coverage, and remaining limitations.

## Local file retention

Completed files survive reload until removed or expired. Local recovery metadata and file availability expire after seven days without transfer activity or a download. Expired bytes are not swept automatically: explicit local removal releases storage, and an explicit receive restart discards an expired partial. Chat records remain in PostgreSQL. Startup/periodic orphan cleanup is deliberately excluded from this exercise and documented as a README limitation.
