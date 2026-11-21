import { useEffect, useState } from "react";
import { parse } from "csv-parse/browser/esm/sync";
import { fromBinary } from "@bufbuild/protobuf";
import { SnapshotSchema } from "../protobuf/snapshot_pb";
import SnapshotNotice, { type SnapshotDetails } from "./SnapshotNotice";
import { loadActiveSnapshot } from "./onlineSnapshot";
import { selectSnapshotCsv } from "./snapshotCsv";
import { csvColumnLabel } from "./csvColumns";
import Footer from "./Footer";
import LanguageSwitch from "./LanguageSwitch";
import { useLanguage } from "./i18n";
import { UiError } from "./messages";
import "./styles.css";

export default function Preview() {
  const { language, locale, columns, t, errorText } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const csv = params.get("csv");
  const [selection, setSelection] = useState<{ modName: string | null; version: string } | null>(null);
  const title = selection ? selection.modName === null ? t("baseGameTitle")
    : `${selection.modName} · ${selection.version || t("unspecifiedVersion")}` : t("previewTitle");
  const [details, setDetails] = useState<SnapshotDetails | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (!csv) throw new UiError("missingCsvPath");
        const stored = await loadActiveSnapshot(controller.signal);
        if (controller.signal.aborted) return;
        const snapshot = fromBinary(SnapshotSchema, stored.bytes);
        const selected = selectSnapshotCsv(snapshot, csv);
        const content = new TextDecoder().decode(selected.bytes);
        const records = parse(content, { bom: true, skip_empty_lines: true, relax_column_count: true }) as string[][];
        setRows(records);
        setSelection({ modName: selected.modName, version: selected.version });
        setDetails({ source: stored.name, uploaded: stored.uploaded, timestamp: snapshot.timestamp.toString(), modsHashes: snapshot.modsHashes });
      } catch (error) {
        if (!controller.signal.aborted) setError(error);
      }
    }
    void load();
    return () => controller.abort();
  }, [csv]);

  useEffect(() => { document.title = `${title} · SSL10n`; }, [title, language]);

  const columnCount = rows?.reduce((count, row) => Math.max(count, row.length), 0) ?? 0;
  return <main className="preview-app">
    <div className="language-toolbar"><LanguageSwitch /></div>
    <header className="preview-header">
      <div><p className="eyebrow">{t("previewEyebrow")}</p><h1>{title}</h1>
        <p className="muted">{rows ? t("tableSummary", { rows: rows.length.toLocaleString(locale), columns: columnCount.toLocaleString(locale) }) : t("previewDescription")}</p>
      </div>
      <a className="button secondary" href="./index.html">{t("backHome")}</a>
    </header>
    {details && <SnapshotNotice details={details} />}
    {error !== null ? <div className="error" role="alert"><p>{errorText(error)}</p></div>
      : rows === null ? <p role="status">{t("loadingCsv")}</p>
      : rows.length === 0 ? <p className="panel">{t("emptyCsv")}</p>
      : <div className="table-scroll" tabIndex={0} role="region" aria-label={t("tableRegion")}>
        <table>
          <caption className="sr-only">{t("tableCaption", { title })}</caption>
          <thead><tr><th scope="col" className="row-number">{t("row")}</th>{Array.from({ length: columnCount }, (_, index) => <th scope="col" className={index === 0 ? "key-column" : undefined} key={index}>{csvColumnLabel(index, columns, t("unnamedLanguage", { column: index + 1 }))}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}><th scope="row" className="row-number">{rowIndex + 1}</th>
            {Array.from({ length: columnCount }, (_, columnIndex) => <td className={columnIndex === 0 ? "key-column" : undefined} key={columnIndex}>{row[columnIndex] ?? ""}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    <Footer />
  </main>;
}

