Use pnpm, not npm.

## Workflow
To typecheck, run `pnpm lint-full` (which also runs typecheck). You may then run `pnpm lint:fix` to attempt to fix linting errors.
You may use `pnpm typecheck` or `pnpm lint` separately when one of the 2 fails to work faster. But both must pass before comitting. 

Don't start the dev environment, I have most likely already started it with `pnpm dev`, running on port 3000.

## Formatting

Avoid if statements without braces except for simple early returns. Add some spacing in your code as well. For example:

Don't write:

```typescript
async function start() {
  if (!options.sender) return;
  options.channel(peer.createDataChannel(`file:${options.id}`, { ordered: true }));
  const offer = await peer.createOffer();
  if (stopped) return;
  await peer.setLocalDescription(offer);
  if (!stopped) options.signal({ description: { type: "offer", sdp: peer.localDescription!.sdp } });
}
```

Instead you should write:

```typescript
async function start() {
  if (!options.sender) return;

  options.channel(peer.createDataChannel(`file:${options.id}`, { ordered: true }));
  const offer = await peer.createOffer();
  if (stopped) return;

  await peer.setLocalDescription(offer);
  if (!stopped) {
    options.signal({ description: { type: "offer", sdp: peer.localDescription!.sdp } });
  }
}
```
