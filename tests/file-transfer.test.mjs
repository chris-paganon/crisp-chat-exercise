import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Node's native TypeScript support needs extensions for the app's bundler imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { createFileSender } = await import("../app/lib/file-transfer/sender.ts");
const { createFileReceiver } = await import("../app/lib/file-transfer/receiver.ts");
const { BATCH_BYTES, CHUNK_BYTES } = await import("../app/lib/file-transfer/protocol.ts");
const { coordinateFileTransfer, registerTransferPeer, unregisterTransferPeer } = await import("../server/utils/chat-transfers.ts");

for (const size of [0, 19, BATCH_BYTES * 3 + 7]) {
  test(`transfer ${size} bytes exactly, with bounded pending writes`, async () => {
    const source = new File([Uint8Array.from({ length: size }, (_, i) => i % 251)], "test.bin");
    const chunks = [];
    let pending = 0;
    let largestPending = 0;
    let senderProgress = 0;
    let receiverProgress = 0;
    let receiver;
    let resolve;
    let reject;
    const finished = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const sender = createFileSender({
      send(data) {
        if (data instanceof ArrayBuffer) {
          pending += data.byteLength;
          largestPending = Math.max(largestPending, pending);
        }
        queueMicrotask(() => receiver.receive(data));
      },
    }, source, (bytes) => { senderProgress = bytes; });
    receiver = createFileReceiver({
      send: data => queueMicrotask(() => sender.receive(data)),
    }, size, {
      async write(chunk) {
        // Slow writes must not let the sender queue another batch.
        await new Promise(yes => setTimeout(yes, 1));
        chunks.push(chunk);
        pending -= chunk.byteLength;
      },
      finish: async () => new File(chunks, "received.bin"),
    }, (bytes) => { receiverProgress = bytes; }, resolve, reject);
    try {
      await sender.start();
      const received = await finished;
      assert.deepEqual(await received.arrayBuffer(), await source.arrayBuffer());
      assert.equal(senderProgress, size);
      assert.equal(receiverProgress, size);
      assert.ok(largestPending <= BATCH_BYTES);
    }
    finally {
      sender.stop();
      receiver.stop();
    }
  });
}

test("receiver rejects incomplete files and excessive queued data", async () => {
  let resolve;
  const failed = new Promise((yes) => {
    resolve = yes;
  });
  const receiver = createFileReceiver({ send() {} }, 10, { async finish() {
    assert.fail("must not finish");
  } }, () => {}, () => assert.fail("must not complete"), resolve);
  receiver.receive(JSON.stringify({ type: "end" }));
  assert.match((await failed).message, /Incomplete/);
  receiver.stop();

  const blocked = createFileReceiver({ send() {} }, BATCH_BYTES * 2, { write: () => new Promise(() => {}) }, () => {}, () => {}, () => {});
  for (let i = 0; i < BATCH_BYTES / CHUNK_BYTES; i++) blocked.receive(new ArrayBuffer(CHUNK_BYTES));
  assert.throws(() => blocked.receive(new ArrayBuffer(CHUNK_BYTES)), /excessive/);
  blocked.stop();
});

test("stopping the sender interrupts an unacknowledged batch", async () => {
  const sender = createFileSender({ send() {} }, new File([new Uint8Array(10)], "test"), () => {});
  const sending = sender.start();
  await new Promise(yes => setTimeout(yes, 0));
  sender.stop();
  await assert.rejects(sending, /stopped/);
});

test("room coordination enforces one transfer, recipient consent and tab ownership", () => {
  const roomId = crypto.randomUUID();
  const makePeer = userId => ({
    id: crypto.randomUUID(),
    context: { roomId, userId, transferReady: true },
    events: [],
    send(event) { this.events.push(event); },
  });
  const sender = makePeer("sender");
  const receiver = makePeer("receiver");
  const anotherTab = makePeer("receiver");
  const peers = [sender, receiver, anotherTab];
  peers.forEach(registerTransferPeer);
  try {
    const id = crypto.randomUUID();
    coordinateFileTransfer(sender, { type: "file-offer", id, name: "file", size: 1, mime: "" });
    assert.equal(receiver.events.at(-1).type, "file-offered");
    assert.equal(anotherTab.events.length, 0);
    coordinateFileTransfer(receiver, { type: "file-offer", id: crypto.randomUUID(), name: "other", size: 1, mime: "" });
    assert.match(receiver.events.at(-1).message, /Only one/);
    coordinateFileTransfer(sender, { type: "file-accept", id });
    assert.equal(sender.events.at(-1).type, "file-error");
    coordinateFileTransfer(anotherTab, { type: "file-accept", id });
    assert.match(anotherTab.events.at(-1).message, /another tab/);
    coordinateFileTransfer(receiver, { type: "file-accept", id });
    assert.equal(sender.events.at(-1).type, "file-accepted");
    unregisterTransferPeer(receiver);
    assert.equal(sender.events.at(-1).status, "failed");
    coordinateFileTransfer(sender, { type: "file-offer", id: crypto.randomUUID(), name: "again", size: 1, mime: "" });
    assert.equal(anotherTab.events.at(-1).type, "file-offered");
  }
  finally {
    peers.forEach(unregisterTransferPeer);
  }
});
