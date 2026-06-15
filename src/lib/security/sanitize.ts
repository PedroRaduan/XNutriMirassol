import sanitizeHtml from "sanitize-html";

export function sanitizeText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export function sanitizeOptionalText(value?: string | null) {
  if (!value) return undefined;
  const clean = sanitizeText(value);
  return clean.length ? clean : undefined;
}
