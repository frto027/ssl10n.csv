import { useLanguage } from "./i18n";

export default function Footer() {
  const { t } = useLanguage();
  return <footer className="page-footer">
    {t("footer")}{" "}
    <a href="https://github.com/frto027/ssl10n.csv" target="_blank" rel="noopener noreferrer">{t("sourceCode")}</a>
  </footer>;
}
