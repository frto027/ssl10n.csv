import type { Snapshot } from "../protobuf/snapshot_pb";
import { UiError } from "./messages";

export function selectSnapshotCsv(snapshot: Snapshot, path: string) {
  if (path === "base-game.csv") {
    if (!snapshot.baseGameCsvTranslation) throw new UiError("missingBaseGame");
    return { bytes: snapshot.baseGameCsvTranslation, modName: null, version: "" };
  }
  const match = /^mods\/([^/]+)\/(\d+)\.csv$/.exec(path);
  if (!match) throw new UiError("invalidCsvPath");
  const key = decodeURIComponent(match[1]!);
  const mod = Object.hasOwn(snapshot.mods, key) ? snapshot.mods[key] : undefined;
  const data = mod?.datas[Number(match[2])];
  if (!mod || !data) throw new UiError("missingModVersion");
  return { bytes: data.csvContent, modName: mod.name || mod.id || key, version: data.version };
}
