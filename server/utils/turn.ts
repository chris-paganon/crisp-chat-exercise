import { createHmac } from "node:crypto";

interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export function createTransferIceServers(secret: string, urls: string, userId: string, now = Date.now()) {
  const iceServers: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];
  const turnUrls = urls.split(",").map(url => url.trim()).filter(Boolean);

  if (!secret && turnUrls.length === 0) return iceServers;

  if (!secret || turnUrls.length === 0 || turnUrls.some(url => !/^turns?:\S+$/.test(url))) {
    throw new Error("Configure both NUXT_TURN_SECRET and valid NUXT_TURN_URLS.");
  }

  // Allow slow large-file transfers to refresh their allocations for up to a day.
  // New and resumed peer connections always request a fresh credential.
  const expiresAt = Math.floor(now / 1000) + 24 * 60 * 60;
  const username = `${expiresAt}:${userId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  iceServers.push({ urls: turnUrls, username, credential });

  return iceServers;
}
