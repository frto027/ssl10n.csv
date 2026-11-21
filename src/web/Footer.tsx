import { useLanguage } from "./i18n";

export default function Footer() {
  const { t } = useLanguage();
  return <footer className="page-footer">{t("footer")}</footer>;
}
