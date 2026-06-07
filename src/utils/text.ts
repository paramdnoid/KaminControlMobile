export function compact(value: string | null | undefined): string {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

// Like compact(), but preserves intentional line breaks. Use for multi-line
// user fields (e.g. report notes) so newlines survive into PDF/JSON output.
export function compactMultiline(value: string | null | undefined): string {
  return `${value ?? ''}`
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeLookup(value: string): string {
  return compact(value)
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('é', 'e')
    .replaceAll('è', 'e')
    .replaceAll('à', 'a')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]+/g, '');
}

export function escapeHtml(value: string | number | null | undefined): string {
  return `${value ?? ''}`
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function joinAddress(street: string, postalCode: string, city: string): string {
  return [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
