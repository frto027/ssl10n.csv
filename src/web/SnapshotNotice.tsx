import type { ReactNode } from "react";
import { useLanguage } from "./i18n";

export type SnapshotDetails = {
  source: string;
  uploaded: boolean;
  timestamp: string;
  modsHashes: string;
};

export default function SnapshotNotice({ details, children }: { details: SnapshotDetails; children?: ReactNode }) {
  const { locale, t } = useLanguage();
  const date = new Date(Number(details.timestamp));
  const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale, { hour12: false });
  const status = t(details.uploaded ? "uploadedFile" : "onlineFile");
  return <aside className="upload-banner snapshot-notice" aria-label={status}>
    <div>
      <strong>{t("fileStatus", { status, source: details.source })}</strong>
      <dl className="snapshot-details">
        <div><dt>{t("timestamp")}</dt><dd>{details.timestamp}{time && <span className="muted">（{time}）</span>}</dd></div>
        <div><dt>{t("modsHashes")}</dt><dd><code>{details.modsHashes || t("emptyValue")}</code></dd></div>
      </dl>
      {details.uploaded && children && <p>{t("savedUpload")}</p>}
    </div>
    {children}
  </aside>;
}
