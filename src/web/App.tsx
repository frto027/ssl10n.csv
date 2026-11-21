import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "../protobuf/snapshot_pb";
import { clearUploadedSnapshot, readUploadedSnapshot, saveUploadedSnapshot } from "./snapshotStorage";
import SnapshotNotice, { type SnapshotDetails } from "./SnapshotNotice";
import Footer from "./Footer";
import LanguageSwitch from "./LanguageSwitch";
import { useLanguage } from "./i18n";
import { UiError } from "./messages";
import { decodeSnapshot, loadActiveSnapshot } from "./onlineSnapshot";

type LoadedSnapshot = { snapshot: Snapshot; source: string; uploaded: boolean };

function formatTimestamp(timestamp: bigint, locale: string) {
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime()) ? timestamp.toString() : date.toLocaleString(locale, { hour12: false });
}

function snapshotDetails(loaded: LoadedSnapshot): SnapshotDetails {
  return {
    source: loaded.source,
    uploaded: loaded.uploaded,
    timestamp: loaded.snapshot.timestamp.toString(),
    modsHashes: loaded.snapshot.modsHashes,
  };
}

function PreviewLink({ path, title }: { path: string; title: string }) {
  const { t } = useLanguage();
  const params = new URLSearchParams({
    csv: path,
  });
  return <a className="button" href={`./index.html?${params}`} target="_blank" rel="noopener" aria-label={t("previewLabel", { title })}>{t("preview")}</a>;
}

export default function App() {
  const { language, locale, t, errorText } = useLanguage();
  const [loaded, setLoaded] = useState<LoadedSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const request = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function acceptSnapshot(bytes: Uint8Array, source: string, uploaded = false, persist = false) {
    const snapshot = decodeSnapshot(bytes);
    if (persist) {
      try {
        saveUploadedSnapshot(source, bytes);
      } catch {
        throw new UiError("storageWriteFailed");
      }
    }
    setLoaded({ snapshot, source, uploaded });
  }

  async function loadCurrentSnapshot(initialError: Error | null = null) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(initialError);
    try {
      const stored = await loadActiveSnapshot(controller.signal);
      if (!controller.signal.aborted) acceptSnapshot(stored.bytes, stored.name, stored.uploaded);
    } catch (error) {
      if (!controller.signal.aborted) setError(initialError ? new AggregateError([initialError, error]) : error);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function loadFile(file: File) {
    setSelectedFileName(file.name);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      if (!file.name.toLowerCase().endsWith(".protobuf")) throw new UiError("invalidFileExtension");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!controller.signal.aborted) acceptSnapshot(bytes, file.name, true, true);
    } catch (error) {
      if (!controller.signal.aborted) setError(new UiError("fileParseFailed", { error: error instanceof Error ? error : String(error) }));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function clearUpload() {
    try {
      clearUploadedSnapshot();
    } catch {
      setError(new UiError("storageClearFailed"));
      return;
    }
    if (fileInput.current) fileInput.current.value = "";
    setSelectedFileName("");
    setLoaded(null);
    void loadCurrentSnapshot();
  }

  useEffect(() => {
    try {
      const stored = readUploadedSnapshot();
      if (stored) decodeSnapshot(stored.bytes);
      void loadCurrentSnapshot();
    } catch (error) {
      // Fall back to the manifest if browser storage is unavailable or corrupt.
      try { clearUploadedSnapshot(); } catch { /* Storage may be disabled. */ }
      void loadCurrentSnapshot(new UiError("restoreFailed", { error: error instanceof Error ? error : String(error) }));
    }
    return () => {
      request.current?.abort();
    };
  }, []);

  useEffect(() => { document.title = t("siteTitle"); }, [language]);

  const mods = loaded ? Object.entries(loaded.snapshot.mods).sort(([a], [b]) => a.localeCompare(b)) : [];
  const pcMods = loaded ? Object.entries(loaded.snapshot.pcMods).sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <main className="app">
      <div className="language-toolbar"><LanguageSwitch /></div>
      {loaded?.uploaded && <SnapshotNotice details={snapshotDetails(loaded)}>
        <button className="button secondary" type="button" onClick={clearUpload}>{t("clear")}</button>
      </SnapshotNotice>}
      <header className="page-header">
        <p className="eyebrow">{t("homeEyebrow")}</p>
        <h1>{t("homeTitle")}</h1>
        {loaded && !loaded.uploaded && <p className="muted">{t("attribution")}<a href="https://crowdin.com/project/siralocalizer" target="_blank" rel="noopener noreferrer">{t("projectLink")}</a></p>}
      </header>

      <section className="panel" aria-labelledby="source-title">
        <h2 id="source-title">{t("loadOld")}</h2>
        <div className="source-controls">
          <div className="file-field">
            <label htmlFor="snapshot-file">{t("selectFile")}</label>
            <div className="file-picker">
              <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>{t("chooseFile")}</button>
              <span className="file-picker-name">{selectedFileName || t("noFile")}</span>
              <input id="snapshot-file" className="sr-only" ref={fileInput} type="file" accept=".protobuf" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadFile(file);
                event.target.value = "";
              }} />
            </div>
          </div>
          <button type="button" className="button secondary" onClick={clearUpload}>{t("loadLatest")}</button>
        </div>
        <div aria-live="polite">{loading && <p role="status">{t("loadingSnapshot")}</p>}</div>
        {error !== null && <p className="error" role="alert">{errorText(error)}</p>}
      </section>

      {loaded && !loaded.uploaded && <SnapshotNotice details={snapshotDetails(loaded)} />}

      {loaded && <div aria-busy={loading}>
        <section className="snapshot-info" aria-label={t("snapshotInfo")}>
          <div><span className="muted">{t("currentFile")}</span><strong>{loaded.source}</strong></div>
          <div><span className="muted">{t("snapshotTime")}</span><strong>{formatTimestamp(loaded.snapshot.timestamp, locale)}</strong></div>
          <div><span className="muted">{t("modCount")}</span><strong>{mods.length + pcMods.length}</strong></div>
        </section>
        {loaded.snapshot.displayMessage && <aside className="panel notice">
          <h2>{t("announcement")}</h2><p>{loaded.snapshot.displayMessage.message || t("emptyAnnouncement")}</p>
        </aside>}

        {loaded.snapshot.baseGameCsvTranslation && <section className="panel item">
          <div><h2>Beat Saber</h2><p className="muted">{t("baseGame")}</p></div>
          <PreviewLink path="base-game.csv" title={t("baseGameTitle")} />
        </section>}

        <section aria-labelledby="mods-title">
          <div className="section-heading"><h2 id="mods-title">{t("mods")}</h2><span className="muted">{t("itemCount", { count: mods.length.toLocaleString(locale) })}</span></div>
          {mods.length === 0 && <p className="panel muted">{t("noMods")}</p>}
          <div className="mod-list">{mods.map(([key, mod]) => <article className="panel mod-item" key={key}>
            <div className="mod-heading"><h3>{mod.name || mod.id || key}</h3><code>{mod.id || key}</code></div>
            {mod.datas.length === 0 ? <p className="muted">{t("noTranslations")}</p> : <ul className="version-list">
              {mod.datas.map((data, index) => <li key={index}>
                <div><span className="muted">{t("version")}</span> <code className="version-badge">{data.version || t("unspecified")}</code><span className="file-size">{data.csvContent.byteLength.toLocaleString(locale)} {t("bytes")}</span></div>
                <PreviewLink path={`mods/${encodeURIComponent(key)}/${index}.csv`} title={`${mod.name || mod.id || key} · ${data.version || t("unspecifiedVersion")}`} />
              </li>)}
            </ul>}
          </article>)}</div>
        </section>
        <section aria-labelledby="pc-mods-title">
          <div className="section-heading"><h2 id="pc-mods-title">{t("pcMods")}</h2><span className="muted">{t("itemCount", { count: pcMods.length.toLocaleString(locale) })}</span></div>
          {pcMods.length === 0 && <p className="panel muted">{t("noPcMods")}</p>}
          <div className="mod-list">{pcMods.map(([id, content]) => <article className="panel mod-item" key={id}>
            <div className="mod-heading"><h3>{id}</h3></div>
            <ul className="version-list"><li>
              <div className="muted">{content.byteLength.toLocaleString(locale)} {t("bytes")}</div>
              <PreviewLink path={`pc-mods/${encodeURIComponent(id)}.csv`} title={id} />
            </li></ul>
          </article>)}</div>
        </section>
      </div>}
      <Footer />
    </main>
  );
}
