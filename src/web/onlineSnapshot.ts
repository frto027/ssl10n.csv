import { fromBinary } from "@bufbuild/protobuf";
import { SnapshotSchema } from "../protobuf/snapshot_pb";
import { UiError } from "./messages";
import { readOnlineSnapshot, readUploadedSnapshot, saveOnlineSnapshot } from "./snapshotStorage";

export function decodeSnapshot(bytes: Uint8Array) {
  if (bytes.length === 0) throw new UiError("emptyProtobuf");
  const snapshot = fromBinary(SnapshotSchema, bytes);
  if (!snapshot.baseGameCsvTranslation && Object.keys(snapshot.mods).length === 0
    && Object.keys(snapshot.pcMods).length === 0) {
    throw new UiError("missingTranslations");
  }
  return snapshot;
}

async function loadManifest(signal: AbortSignal) {
  const manifestUrl = new URL(`${import.meta.env.BASE_URL}manifest.json`, window.location.href);
  const requestUrl = new URL(manifestUrl);
  requestUrl.searchParams.set("time", Date.now().toString());
  const response = await fetch(requestUrl, { signal, cache: "no-cache" });
  if (!response.ok) throw new UiError("manifestLoadFailed", { status: response.status });
  const manifest: unknown = await response.json();
  if (!manifest || typeof manifest !== "object" || !("protobufSnapshotBinaryUrl" in manifest)
    || typeof manifest.protobufSnapshotBinaryUrl !== "string" || !manifest.protobufSnapshotBinaryUrl) {
    throw new UiError("missingManifestUrl");
  }
  const publishedUrl = new URL(manifest.protobufSnapshotBinaryUrl, manifestUrl);
  if (!["http:", "https:"].includes(publishedUrl.protocol)) throw new UiError("invalidManifestUrl");
  const name = publishedUrl.pathname.split("/").pop();
  if (!name) throw new UiError("invalidManifestUrl");
  signal.throwIfAborted();
  return { manifestUrl, publishedUrl, name };
}

type ManifestSnapshot = Awaited<ReturnType<typeof loadManifest>>;

async function onlineFromManifest(signal: AbortSignal, { manifestUrl, publishedUrl, name }: ManifestSnapshot) {
  try {
    const cached = readOnlineSnapshot();
    if (cached?.name === name) {
      decodeSnapshot(cached.bytes);
      return cached;
    }
  } catch { /* Download again when cached data is corrupt or unreadable. */ }

  // Prefer a sibling file so local development uses the local snapshot.
  const siblingUrl = new URL(name, manifestUrl);
  let binary = await fetch(siblingUrl, { signal, cache: "no-cache" });
  if (!binary.ok && siblingUrl.href !== publishedUrl.href) {
    binary = await fetch(publishedUrl, { signal, cache: "no-cache" });
  }
  if (!binary.ok) throw new UiError("protobufLoadFailed", { status: binary.status });
  const bytes = new Uint8Array(await binary.arrayBuffer());
  signal.throwIfAborted();
  decodeSnapshot(bytes);
  const loadedAt = Date.now();
  try {
    saveOnlineSnapshot(name, bytes, loadedAt);
  } catch {
    throw new UiError("storageWriteFailed");
  }
  return { name, bytes, loadedAt };
}

export async function loadOnlineSnapshot(signal: AbortSignal) {
  return onlineFromManifest(signal, await loadManifest(signal));
}

export async function loadActiveSnapshot(signal: AbortSignal) {
  // Every page checks the latest manifest, even when displaying an upload.
  const manifest = await loadManifest(signal);
  const uploaded = readUploadedSnapshot();
  if (uploaded) return { ...uploaded, uploaded: true };
  return { ...await onlineFromManifest(signal, manifest), uploaded: false };
}
