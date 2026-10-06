import type { FileClientEvent, FileServerEvent, FileSignal, FileRecord } from "~~/shared/types/file-transfer";
import type { TransferView } from "./model";
import type { SessionOptions, TransferSession } from "./session";
import type { LocalControl } from "./recovery";
import { isFileTerminal } from "~~/shared/types/file-transfer";
import { ConnectionUnavailableError } from "../chat-error";
import { asTransferError } from "./rtc-peer";
import { saveIndexedDbLocalControl, deleteIndexedDbLocalControl } from "./recovery";

export interface TransferOptions {
  roomId: string;
  userId: () => string;
  connected: () => boolean;
  historyReady: () => boolean;
  send: (event: FileClientEvent) => void;
  changed: () => void;
}

type TransferStart = Extract<FileServerEvent, { type: "file-start" }>;
type TransferRequest<Event> = Extract<Event, { type: "file-accept" | "file-resume" }>;

interface TransferBehavior {
  needsSource?: () => boolean;
  offerAcknowledged?: () => void;
  // Detach resources immediately, then queue their cleanup behind the previous attempt.
  closeResources: (previous: Promise<void>) => Promise<void>;
  finish: (record: FileRecord) => void;
  inspectLocal?: () => Promise<void>;
  resume: () => void;
  connected: () => void;
  createSession: (options: SessionOptions, current: () => boolean, event: TransferStart) => TransferSession & { start?: () => void };
}

interface LifecycleState {
  session?: TransferSession;
  attempt?: string;
  // A sent offer, accept, or resume allows file-start and prevents duplicate requests.
  requestSent: boolean;
  preparing: boolean;
  generation: number;
  closing: Promise<void>;
  pendingControl?: LocalControl;
  controlSaving?: Promise<void>;
  mobileConsent?: boolean;
  lastProgressAt?: number;
}

/** Common record, attempt, and cancellation handling. File resources belong to each role. */
export function createTransferLifecycle<Event extends FileClientEvent>(item: TransferView, options: TransferOptions, behavior: TransferBehavior) {
  const state: LifecycleState = {
    requestSent: false, preparing: false, generation: 0, closing: Promise.resolve(),
  };
  const key = () => ({ userId: options.userId(), roomId: options.roomId, id: item.id });
  const publish = options.changed;
  let disposed = false;

  function isCurrent(generation: number) {
    return !disposed && state.generation === generation;
  }

  function update(patch: Partial<TransferView>) {
    Object.assign(item, patch);
    publish();
  }

  function send(event: FileClientEvent) {
    try {
      options.send(event);
      return true;
    }
    catch (error) {
      if (!(error instanceof ConnectionUnavailableError)) {
        throw error;
      }
      return false;
    }
  }

  function closeResources() {
    state.generation++;
    state.session?.close();
    state.session = undefined;
    state.attempt = undefined;
    state.requestSent = false;
    state.preparing = false;
    state.closing = behavior.closeResources(state.closing).catch((error) => {
      update({ message: asTransferError(error).message });
    });
  }

  function interrupt(message: string, notify = true) {
    if (isFileTerminal(item.status)) return;

    const attempt = state.attempt;
    closeResources();
    update({ status: "interrupted", message, needsSource: behavior.needsSource?.() ?? false });
    if (notify) {
      send({ type: "file-pause", id: item.id, attempt });
    }
  }

  function finish(record: FileRecord) {
    closeResources();
    state.pendingControl = undefined;
    void clearControl();
    update({
      controlPending: false,
      status: record.status as TransferView["status"], message: record.message ?? undefined,
      bytes: record.status === "completed" ? record.size : item.bytes, needsSource: false,
    });
  }

  function fail(error: unknown) {
    // Transport and storage failures retain recovery data; cancellation is explicit.
    interrupt(asTransferError(error).message.slice(0, 500));
  }

  function restore(record: FileRecord, fresh = false) {
    if (disposed || record.roomId !== options.roomId) return;
    if (!fresh && (item.version ?? -1) >= record.version) return;

    behavior.offerAcknowledged?.();
    item.createdAt = record.createdAt;
    item.version = record.version;
    item.persistedStatus = record.status;
    item.fingerprint = record.fingerprint;
    if (state.pendingControl && !isFileTerminal(record.status)) {
      update({ status: state.pendingControl === "file-cancel" ? "cancelled" : "declined", controlPending: true });
      return;
    }

    if (isFileTerminal(record.status)) {
      behavior.finish(record);
    }
    else if (record.status === "interrupted") {
      interrupt(record.message ?? "Transfer interrupted. Resume when both sides are ready.", false);
    }
    else if (record.status === "offered") {
      if (state.session || (state.requestSent && record.message)) {
        closeResources();
      }
      update({ status: "offered", message: record.message ?? undefined, needsSource: behavior.needsSource?.() ?? false });
    }
    else if (!state.session && !state.preparing && !state.requestSent) {
      update({ status: "interrupted", needsSource: behavior.needsSource?.() ?? false });
    }
    if (fresh || isFileTerminal(record.status)) {
      void behavior.inspectLocal?.();
    }
    publish();
  }

  function requestConsent() {
    if (state.mobileConsent) return true;

    const network = (navigator as Navigator & { connection?: { type?: string } }).connection;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
    if ((network?.type === "cellular" || (mobile && !network?.type))
      && !window.confirm("Transfer this large file? Your connection may use mobile data and incur charges.")) {
      return false;
    }
    state.mobileConsent = true;
    return true;
  }

  function canRequest() {
    return !disposed && !isFileTerminal(item.status)
      && !state.preparing && !state.requestSent && !state.session && !state.pendingControl;
  }

  function connectionReady() {
    return options.historyReady() && options.connected();
  }

  /** Roles prepare their own resources; attempt guards and request bookkeeping stay common. */
  async function request(type: TransferRequest<Event>["type"], prepare: (generation: number) => Promise<TransferRequest<Event> | undefined>) {
    if (!canRequest()) return;

    const reconnectMessage = type === "file-accept" ? "Reconnect to accept this file." : "Reconnect to resume this transfer.";
    if (!connectionReady()) {
      update({ message: reconnectMessage });
      return;
    }
    state.preparing = true;
    const generation = state.generation;
    update({ status: "preparing", message: undefined });
    try {
      const event = await prepare(generation);
      if (!event || !isCurrent(generation)) return;

      state.requestSent = send(event);
      if (!isCurrent(generation)) return;

      if (!state.requestSent) {
        interrupt(reconnectMessage, false);
      }
      else {
        update({ status: "waiting", message: undefined });
      }
    }
    catch (error) {
      if (state.generation === generation && !isFileTerminal(item.status)) {
        fail(error);
      }
    }
    finally {
      if (state.generation === generation) {
        state.preparing = false;
        if (!state.requestSent && item.status === "preparing") {
          update({ status: item.persistedStatus === "offered" ? "offered" : "interrupted" });
        }
      }
    }
  }

  function start(event: TransferStart) {
    if (state.session || isFileTerminal(item.status) || !state.requestSent) return;
    if (event.offset > item.size) return fail(new Error("Invalid resume position."));

    state.attempt = event.attempt;
    update({ status: "connecting", bytes: event.offset, message: undefined });
    const generation = state.generation;
    const current = () => isCurrent(generation) && state.attempt === event.attempt;
    const sessionOptions: SessionOptions = {
      id: item.id, roomId: options.roomId, offset: event.offset,
      sendSignal(signal: FileSignal) {
        if (current() && !send({ type: "file-signal", id: item.id, attempt: event.attempt, signal })) {
          throw new ConnectionUnavailableError();
        }
      },
      progress(bytes: number) {
        if (!current()) return;

        item.bytes = bytes;
        const now = performance.now();
        if (bytes === item.size || now - (state.lastProgressAt ?? 0) >= 100) {
          state.lastProgressAt = now;
          publish();
        }
      },
      connected() {
        if (!current()) return;

        update({ status: "transferring" });
      },
      fail(error: Error) {
        if (!current()) return;

        fail(error);
      },
    };
    try {
      const session = behavior.createSession(sessionOptions, current, event);
      state.session = session;
      session.start?.();
    }
    catch (error) {
      fail(error);
    }
  }

  function receiveServerEvent(event: Exclude<FileServerEvent, { type: "file-record" }>) {
    if (disposed) return;
    if (isFileTerminal(item.status) && !state.pendingControl) return;

    switch (event.type) {
      case "file-start":
        start(event);
        break;
      case "file-signal":
        if (event.attempt === state.attempt) {
          state.session?.receiveSignal(event.signal);
        }
        break;
      case "file-wake":
        resumeIfNeeded();
        break;
      case "file-waiting":
        if (state.requestSent) {
          update({ status: "waiting" });
        }
        break;
      case "file-error":
        if (state.pendingControl) {
          state.pendingControl = undefined;
          void clearControl();
          update({ status: item.persistedStatus === "offered" ? "offered" : "interrupted", controlPending: false, message: event.message });
          break;
        }
        if (!event.attempt || event.attempt === state.attempt) {
          interrupt(event.message, false);
        }
        break;
    }
  }

  async function clearControl() {
    await state.controlSaving;
    try {
      await deleteIndexedDbLocalControl(key());
    }
    catch (error) {
      if (!disposed) {
        update({ message: asTransferError(error).message });
      }
    }
  }

  function resumeIfNeeded() {
    if (!canRequest()) return;

    behavior.resume();
  }

  function connected() {
    if (state.pendingControl) {
      void (state.controlSaving ?? Promise.resolve()).then(() => {
        if (state.pendingControl) {
          send({ type: state.pendingControl, id: item.id });
        }
      });
    }
    else {
      behavior.connected();
    }
  }

  function stop(type: LocalControl, serverKnowsOffer = true) {
    if (isFileTerminal(item.status)) return false;

    // A file that has never been offered has no server record to cancel.
    if (item.persistedStatus === undefined && !serverKnowsOffer) {
      closeResources();
      update({ status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false });
      return true;
    }

    state.pendingControl = type;
    closeResources();
    update({ status: type === "file-cancel" ? "cancelled" : "declined", needsSource: false, controlPending: true });
    state.controlSaving = saveIndexedDbLocalControl(key(), type).catch((error) => {
      update({ message: `Cannot save pending cancellation: ${asTransferError(error).message}` });
    });
    void state.controlSaving.then(() => {
      if (state.pendingControl === type) {
        send({ type, id: item.id });
      }
    });
    return true;
  }

  function disconnect() {
    if (!isFileTerminal(item.status)) {
      interrupt("Connection interrupted. Your saved progress is kept.");
    }
  }

  function restoreControl(command: LocalControl | undefined) {
    state.pendingControl = command;
  }

  function dispose() {
    disposed = true;
  }

  return {
    state, key, isCurrent, isDisposed: () => disposed, update, publish,
    send: (event: Event) => send(event),
    restore, restoreControl, requestConsent, canRequest, connectionReady, request,
    interrupt, finish, fail, receiveServerEvent, resumeIfNeeded, connected, stop, disconnect, dispose,
  };
}
