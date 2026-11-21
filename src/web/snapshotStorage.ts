import { UiError } from "./messages";

export const UPLOADED_PROTOBUF_KEY = "ssl10n.uploadedProtobuf";

export const ONLINE_PROTOBUF_KEY = "ssl10n.onlineProtobuf";

function saveSnapshot(key: string, name: string, bytes: Uint8Array) {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  localStorage.setItem(key, JSON.stringify({ name, base64: btoa(chunks.join("")) }));
}

function readSnapshot(key: string): { name: string; bytes: Uint8Array } | null {
  const value = localStorage.getItem(key);
  if (value === null || value === "") return null;
  const stored: unknown = JSON.parse(value);
  if (!stored || typeof stored !== "object" || !("name" in stored) || !("base64" in stored)
    || typeof stored.name !== "string" || typeof stored.base64 !== "string") {
    throw new UiError("invalidStoredData");
  }
  return { name: stored.name, bytes: Uint8Array.from(atob(stored.base64), character => character.charCodeAt(0)) };
}

export function clearUploadedSnapshot() {
  localStorage.removeItem(UPLOADED_PROTOBUF_KEY);
}

export function saveUploadedSnapshot(name: string, bytes: Uint8Array) {
  saveSnapshot(UPLOADED_PROTOBUF_KEY, name, bytes);
}

export function readUploadedSnapshot() {
  return readSnapshot(UPLOADED_PROTOBUF_KEY);
}

export function saveOnlineSnapshot(name: string, bytes: Uint8Array) {
  saveSnapshot(ONLINE_PROTOBUF_KEY, name, bytes);
}

export function readOnlineSnapshot() {
  return readSnapshot(ONLINE_PROTOBUF_KEY);
}

export function readActiveSnapshot() {
  const uploaded = readUploadedSnapshot();
  if (uploaded) return { ...uploaded, uploaded: true };
  const online = readOnlineSnapshot();
  return online ? { ...online, uploaded: false } : null;
}
