// Language columns follow CrowdinZipFile.crowdin_order. The base-game CSV
// additionally identifies Icelandic and Irish after those 28 languages.
export function csvColumnLabel(index: number, labels: readonly string[], fallback: string) {
  return labels[index] ?? fallback;
}
