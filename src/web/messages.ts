import zh from "./langs/zh";
import en from "./langs/en";

export type Language = "zh" | "en";
export type MessageKey = Exclude<keyof typeof zh, "columns" | "locale">;
export type MessageValues = Record<string, string | number | Error>;
export const messages = { zh, en };

export class UiError extends Error {
  constructor(public key: MessageKey, public values: MessageValues = {}) {
    super(key);
  }
}

export function translate(language: Language, key: MessageKey, values: MessageValues = {}): string {
  return messages[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : value instanceof Error ? translateError(language, value) : String(value);
  });
}

export function translateError(language: Language, error: unknown): string {
  if (error instanceof AggregateError) return error.errors.map(item => translateError(language, item)).join(" ");
  return error instanceof UiError ? translate(language, error.key, error.values)
    : error instanceof Error ? error.message : String(error);
}
