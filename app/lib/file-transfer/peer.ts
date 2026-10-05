import type { FileSignal } from "~~/shared/types/file-transfer";

interface PeerOptions {
  id: string;
  sender: boolean;
  signal: (signal: FileSignal) => void;
  channel: (channel: RTCDataChannel) => void;
  fail: (error: Error) => void;
}

export function createFilePeer(options: PeerOptions) {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  let stopped = false;
  const candidates: (RTCIceCandidateInit | null)[] = [];
  let signaling = Promise.resolve();

  peer.onicecandidate = ({ candidate }) => {
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
  peer.onconnectionstatechange = () => {
    if (!stopped && ["failed", "disconnected", "closed"].includes(peer.connectionState)) {
      options.fail(new Error("Peer connection lost. Send the file again once connected."));
    }
  };
  peer.ondatachannel = ({ channel }) => {
    if (stopped || options.sender) {
      channel.close();
      return;
    }
    options.channel(channel);
  };

  async function start() {
    if (!options.sender) return;
    options.channel(peer.createDataChannel(`file:${options.id}`, { ordered: true }));
    const offer = await peer.createOffer();
    if (stopped) return;
    await peer.setLocalDescription(offer);
    if (!stopped) options.signal({ description: { type: "offer", sdp: peer.localDescription!.sdp } });
  }

  function receive(signal: FileSignal) {
    // Serialize descriptions and ICE; candidates may arrive before the remote description.
    signaling = signaling.then(async () => {
      if (stopped) return;
      if ("candidate" in signal) {
        if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate ?? undefined);
        else if (candidates.length < 256) candidates.push(signal.candidate);
        else throw new Error("Too many connection candidates.");
        return;
      }
      if (peer.remoteDescription) throw new Error("Unexpected connection renegotiation.");
      await peer.setRemoteDescription(signal.description);
      if (stopped) return;
      for (const candidate of candidates.splice(0)) await peer.addIceCandidate(candidate ?? undefined);
      if (!options.sender) {
        await peer.setLocalDescription(await peer.createAnswer());
        if (!stopped) options.signal({ description: { type: "answer", sdp: peer.localDescription!.sdp } });
      }
    }).catch((error) => {
      if (!stopped) options.fail(asTransferError(error));
    });
  }

  return {
    start,
    receive,
    close() {
      stopped = true;
      peer.close();
    },
  };
}

export function asTransferError(error: unknown) {
  return error instanceof Error ? error : new Error("File transfer failed. Please try again.");
}
