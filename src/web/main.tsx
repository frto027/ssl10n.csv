import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Preview from "./preview";
import { LanguageProvider } from "./i18n";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const isPreview = params.has("csv");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>{isPreview ? <Preview /> : <App />}</LanguageProvider>
  </StrictMode>,
);
