import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { messages, translate, translateError, type Language, type MessageKey, type MessageValues } from "./messages";

const LANGUAGE_KEY = "ssl10n.language";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void } | null>(null);

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "zh") return saved;
  } catch { /* Use browser preferences when storage is unavailable. */ }
  const preferences = typeof navigator === "undefined" ? []
    : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const preference of preferences) {
    const language = preference.toLowerCase().split("-")[0];
    if (language === "zh" || language === "en") return language;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(savedLanguage);
  function setLanguage(value: Language) {
    updateLanguage(value);
    try { localStorage.setItem(LANGUAGE_KEY, value); } catch { /* Switching still works without storage. */ }
  }
  useEffect(() => {
    document.documentElement.lang = messages[language].locale;
  }, [language]);
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === LANGUAGE_KEY || event.key === null) updateLanguage(savedLanguage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  const { language } = context;
  return {
    ...context,
    locale: messages[language].locale,
    columns: messages[language].columns,
    t: (key: MessageKey, values?: MessageValues) => translate(language, key, values),
    errorText: (error: unknown) => translateError(language, error),
  };
}
