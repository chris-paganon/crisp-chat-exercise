import type { FileSignal } from "~~/shared/types/file-transfer";

interface RTCPeerOptions {
  id: string;
  sender: boolean;
  signal: (signal: FileSignal) => void;
  channel: (channel: RTCDataChannel) => void;
  fail: (error: Error) => void;
  connectionLost: (state: RTCPeerConnectionState) => void;
}

export function createRTCPeer(options: RTCPeerOptions) {
  const RTCPeer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  let stopped = false;
  const candidates: (RTCIceCandidateInit | null)[] = [];
  let signaling = Promise.resolve();

  RTCPeer.onicecandidate = ({ candidate }) => {
    if (stopped) return;
    try {
      options.signal({ candidate: candidate
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
    if (stopped || options.sender) {
      channel.close();
      return;
    }
    options.channel(channel);
  };

  async function start() {
    if (!options.sender) return;

    options.channel(RTCPeer.createDataChannel(`file:${options.id}`, { ordered: true }));
    const offer = await RTCPeer.createOffer();
    if (stopped) return;

    await RTCPeer.setLocalDescription(offer);
    if (!stopped) {
      options.signal({ description: { type: "offer", sdp: RTCPeer.localDescription!.sdp } });
    }
  }

  function receiveSignal(signal: FileSignal) {
    // Serialize descriptions and ICE; candidates may arrive before the remote description.
    signaling = signaling.then(async () => {
      if (stopped) return;
      if ("candidate" in signal) {
        if (RTCPeer.remoteDescription) await RTCPeer.addIceCandidate(signal.candidate ?? undefined);
        else if (candidates.length < 256) candidates.push(signal.candidate);
        else throw new Error("Too many connection candidates.");
        return;
      }

      if (RTCPeer.remoteDescription) {
        throw new Error("Unexpected connection renegotiation.");
      }

      await RTCPeer.setRemoteDescription(signal.description);
      if (stopped) return;

      for (const candidate of candidates.splice(0)) await RTCPeer.addIceCandidate(candidate ?? undefined);
      if (!options.sender) {
        await RTCPeer.setLocalDescription(await RTCPeer.createAnswer());
        if (!stopped) options.signal({ description: { type: "answer", sdp: RTCPeer.localDescription!.sdp } });
      }
    }).catch((error) => {
      if (!stopped) options.fail(asTransferError(error));
    });
  }

  return {
    start,
    receiveSignal,
    close() {
      stopped = true;
      RTCPeer.close();
    },
  };
}

export function asTransferError(error: unknown) {
  return error instanceof Error ? error : new Error("File transfer failed. Please try again.");
}
