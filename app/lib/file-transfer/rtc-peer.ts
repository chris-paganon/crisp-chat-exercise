import type { FileSignal } from "~~/shared/types/file-transfer";

interface RTCPeerOptions {
  id: string;
  roomId: string;
  initiator: boolean;
  sendSignal: (signal: FileSignal) => void;
  onRtcDataChannel: (channel: RTCDataChannel) => void;
  fail: (error: Error) => void;
  connectionLost: (state: RTCPeerConnectionState) => void;
}

export function createRTCPeer(options: RTCPeerOptions) {
  const RTCPeer = new RTCPeerConnection();
  let stopped = false;
  const candidates: (RTCIceCandidateInit | null)[] = [];
  const controller = new AbortController();
  // Both offer creation and incoming signaling wait for fresh attempt credentials.
  const configured = $fetch(`/api/rooms/${encodeURIComponent(options.roomId)}/ice-servers`, {
    signal: controller.signal,
    timeout: 10000,
    retry: 0,
  }).then(({ iceServers }) => {
    if (stopped) return false;

    RTCPeer.setConfiguration({ iceServers });
    return true;
  }).catch(() => {
    if (!stopped) {
      options.fail(new Error("Could not configure the file connection. Please try again."));
    }
    return false;
  });

  RTCPeer.onicecandidate = ({ candidate }) => {
    if (stopped) return;
    try {
      options.sendSignal({ candidate: candidate
        ? {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          }
        : null });
    }
    catch (error) {
      options.fail(asTransferError(error));
    }
  };
  RTCPeer.onconnectionstatechange = () => {
    if (!stopped && ["failed", "disconnected", "closed"].includes(RTCPeer.connectionState)) {
      options.connectionLost(RTCPeer.connectionState);
    }
  };
  RTCPeer.ondatachannel = ({ channel }) => {
    if (stopped || options.initiator) {
      channel.close();
      return;
    }
    options.onRtcDataChannel(channel);
  };

  async function start() {
    if (!options.initiator) return;
    if (!await configured || stopped) return;

    options.onRtcDataChannel(RTCPeer.createDataChannel(`file:${options.id}`, { ordered: true }));
    const offer = await RTCPeer.createOffer();
    if (stopped) return;

    await RTCPeer.setLocalDescription(offer);
    if (!stopped) {
      options.sendSignal({ description: { type: "offer", sdp: RTCPeer.localDescription!.sdp } });
    }
  }

  // Setup a simple async queue. Each signal is processed in order.
  let signaling = Promise.resolve();
  function receiveSignal(signal: FileSignal) {
    // Serialize descriptions and ICE; candidates may arrive before the remote description.
    signaling = signaling.then(async () => {
      if (!await configured || stopped) return;

      if ("candidate" in signal) {
        if (RTCPeer.remoteDescription) {
          await RTCPeer.addIceCandidate(signal.candidate ?? undefined);
        }
        else if (candidates.length < 256) {
          candidates.push(signal.candidate);
        }
        else {
          throw new Error("Too many connection candidates.");
        }
        return;
      }

      if (RTCPeer.remoteDescription) {
        throw new Error("Unexpected connection renegotiation.");
      }

      await RTCPeer.setRemoteDescription(signal.description);
      if (stopped) return;

      for (const candidate of candidates.splice(0)) {
        await RTCPeer.addIceCandidate(candidate ?? undefined);
      }

      if (!options.initiator) {
        await RTCPeer.setLocalDescription(await RTCPeer.createAnswer());
        if (!stopped) {
          options.sendSignal({ description: { type: "answer", sdp: RTCPeer.localDescription!.sdp } });
        }
      }
    }).catch((error) => {
      if (!stopped) {
        options.fail(asTransferError(error));
      }
    });
  }

  return {
    start,
    receiveSignal,
    close() {
      stopped = true;
      controller.abort();
      RTCPeer.close();
    },
  };
}

export function asTransferError(error: unknown) {
  return error instanceof Error ? error : new Error("File transfer failed. Please try again.");
}
