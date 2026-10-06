import type { FileSenderEvent, FileRecord } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { TransferOptions } from "./lifecycle";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import { createTransferLifecycle } from "./lifecycle";
import { createTransferSession } from "./session";
import { verifyFileFingerprint } from "./fingerprint";

interface OutgoingResources {
  source?: File;
  pendingOffer: boolean;
  // The server may know this offer even if its acknowledgement was lost.
  offerSent: boolean;
}

/** Owns source verification, offering, source reselection, and sending. */
export function createOutgoingTransfer(item: TransferView, options: TransferOptions) {
  const resource: OutgoingResources = { pendingOffer: false, offerSent: false };
  const lifecycle = createTransferLifecycle<FileSenderEvent>(item, options, {
    needsSource: () => !resource.source,
    offerAcknowledged() {
      resource.pendingOffer = false;
    },
    requestPreparing() {
      resource.pendingOffer = item.persistedStatus === undefined;
    },
    closeResources(previous) {
      resource.pendingOffer = false;
      return previous;
    },
    finish,
    resume: () => { void resume(); },
    connected,
    createSession(sessionOptions, current) {
      if (!resource.source) {
        throw new Error("Reselect the original file to resume.");
      }

      return createTransferSession({
        ...sessionOptions,
        direction: "outgoing",
        source: resource.source,
        sent() {
          if (current()) {
            update({ status: "finishing" });
          }
        },
      });
    },
  });
  const { state, update, isCurrent } = lifecycle;

  async function verifySource(file: File) {
    const generation = state.generation;
    update({ status: "verifying", message: undefined });
    const fingerprint = await verifyFileFingerprint(file, () => !isCurrent(generation));
    if (!isCurrent(generation)) return false;
    if (item.fingerprint && (item.fingerprint !== fingerprint || file.size !== item.size)) {
      throw new Error("Choose the original file. The selected file's contents do not match this transfer.");
    }
    item.fingerprint = fingerprint;
    resource.source = file;
    item.needsSource = false;
    return true;
  }

  async function offer(file: File) {
    if (lifecycle.isDisposed()) return;

    resource.source = file;
    state.preparing = true;
    resource.pendingOffer = true;
    const generation = state.generation;
    try {
      if (!await verifySource(file)) return;

      state.preparing = false;
      sendOffer();
    }
    catch (error) {
      if (state.generation === generation) {
        state.preparing = false;
        if (!isFileTerminal(item.status)) {
          lifecycle.fail(error);
        }
      }
    }
  }

  function waitForConnection() {
    state.requestSent = false;
    update({ status: "waiting-connection", message: undefined });
  }

  function sendOffer() {
    if (lifecycle.isDisposed() || state.preparing || state.requestSent || !resource.pendingOffer || !item.fingerprint) return;

    if (!lifecycle.connectionReady()) {
      waitForConnection();
      return;
    }

    update({ status: "offering", message: undefined });
    state.requestSent = lifecycle.send({ type: "file-offer", id: item.id, name: item.name, size: item.size, mime: item.mime, fingerprint: item.fingerprint });
    if (state.requestSent) {
      resource.offerSent = true;
    }
    else {
      waitForConnection();
    }
  }

  async function resume(file?: File) {
    if (!lifecycle.canRequest()) return;
    if (!file && !resource.source) {
      update({ status: "interrupted", needsSource: true, message: "Reselect the original file to resume." });
      return;
    }

    await lifecycle.request("file-resume", async (generation) => {
      if (!lifecycle.requestConsent()) return;

      await state.closing;
      if (!isCurrent(generation)) return;

      if ((file || !item.fingerprint) && !await verifySource(file ?? resource.source!)) return;
      if (resource.pendingOffer) {
        state.preparing = false;
        sendOffer();
        return;
      }

      return { type: "file-resume", id: item.id, offset: 0 };
    });
  }

  function finish(record: FileRecord) {
    resource.source = undefined;
    lifecycle.finish(record);
  }

  function connected() {
    if (resource.pendingOffer) {
      sendOffer();
    }
    else if (!isFileTerminal(item.status)) {
      lifecycle.resumeIfNeeded();
    }
  }

  function stop() {
    if (isFileTerminal(item.status)) return;

    resource.source = undefined;
    lifecycle.stop("file-cancel", resource.offerSent);
  }

  function disconnect() {
    if (isFileTerminal(item.status)) return;

    if (resource.pendingOffer) {
      // Socket loss must not cancel hashing or discard the selected File.
      state.requestSent = false;
      if (!state.preparing) {
        waitForConnection();
      }
    }
    else {
      lifecycle.disconnect();
    }
  }

  function dispose() {
    lifecycle.dispose();
    resource.source = undefined;
  }

  return {
    direction: "outgoing" as const,
    view: item, restore: lifecycle.restore, restoreControl: lifecycle.restoreControl,
    requestConsent: lifecycle.requestConsent, offer, resume, stop,
    receiveServerEvent: lifecycle.receiveServerEvent, connected: lifecycle.connected, disconnect, dispose,
  };
}
