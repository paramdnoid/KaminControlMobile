import type { CustomerProperty } from '../types';

// Intelligent local property search shared by the SQLite (native) and web stores
// so both platforms behave identically. It is diacritic-insensitive, supports
// multi-word queries (every word must match somewhere), ranks results by
// relevance instead of plain alphabetical order, and tolerates small typos.

const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n', ý: 'y', ÿ: 'y',
};

const UMLAUT_EXPAND: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue' };

// Fold accents to base letters; keep [a-z0-9] and collapse everything else to
// single spaces. "Zürich, CH-8000" -> "zurich ch 8000".
export function foldText(value: string | null | undefined): string {
  const lower = `${value ?? ''}`.toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (ch === 'ß') {
      out += 'ss';
      continue;
    }
    const folded = ACCENT_MAP[ch] ?? ch;
    out += /[a-z0-9]/.test(folded) ? folded : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Like foldText, but first expands German umlauts (ü -> ue) so that data spelled
// "Müller" still matches a query typed as "mueller" and vice versa.
export function expandText(value: string | null | undefined): string {
  const expanded = `${value ?? ''}`.toLowerCase().replace(/[äöü]/g, (c) => UMLAUT_EXPAND[c] ?? c);
  return foldText(expanded);
}

// Searchable fields with relevance weights. Customer number is the strongest
// signal, names and address next, supporting roles last.
const SEARCH_FIELDS: Array<{ key: keyof CustomerProperty; weight: number }> = [
  { key: 'customerNumber', weight: 12 },
  { key: 'propertyLabel', weight: 7 },
  { key: 'owner', weight: 7 },
  { key: 'tenant', weight: 6 },
  { key: 'street', weight: 6 },
  { key: 'city', weight: 5 },
  { key: 'postalCode', weight: 5 },
  { key: 'caretaker', weight: 3 },
  { key: 'management', weight: 3 },
  { key: 'sourceKey', weight: 1 },
];

// Match-quality multipliers, strongest first.
const QUALITY_EXACT = 4; // whole field equals the word
const QUALITY_PREFIX = 3; // field starts with the word
const QUALITY_WORD_PREFIX = 2; // a word inside the field starts with the word
const QUALITY_SUBSTRING = 1; // the word appears somewhere in the field
const QUALITY_FUZZY = 0.5; // a word inside the field is within typo distance

type QueryToken = { fold: string; exp: string };
type SearchField = { weight: number; variants: string[]; words: string[] };

function tokenize(query: string): QueryToken[] {
  const raw = `${query ?? ''}`.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(/\s+/)
    .map((part) => ({ fold: foldText(part), exp: expandText(part) }))
    .filter((token) => token.fold.length > 0);
}

function buildFields(property: CustomerProperty): SearchField[] {
  const fields: SearchField[] = [];
  for (const { key, weight } of SEARCH_FIELDS) {
    const value = `${(property[key] as string | undefined) ?? ''}`;
    if (!value.trim()) {
      continue;
    }
    const norm = foldText(value);
    const exp = expandText(value);
    const variants = norm === exp ? [norm] : [norm, exp];
    const words = Array.from(new Set(variants.flatMap((variant) => variant.split(' ')))).filter(Boolean);
    fields.push({ weight, variants, words });
  }
  return fields;
}

function maxFuzzyDistance(length: number): number {
  if (length >= 7) {
    return 2;
  }
  if (length >= 4) {
    return 1;
  }
  return 0;
}

// Levenshtein distance with early exit once it provably exceeds `max`.
function boundedDistance(a: string, b: string, max: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) {
    return max + 1;
  }
  let prev = Array.from({ length: bl + 1 }, (_, i) => i);
  for (let i = 1; i <= al; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = value;
      if (value < rowMin) {
        rowMin = value;
      }
    }
    if (rowMin > max) {
      return max + 1;
    }
    prev = cur;
  }
  return prev[bl];
}

function fieldQuality(field: SearchField, token: QueryToken): number {
  const needles = token.fold === token.exp ? [token.fold] : [token.fold, token.exp];
  let best = 0;
  for (const hay of field.variants) {
    for (const needle of needles) {
      if (!needle) {
        continue;
      }
      if (hay === needle) {
        return QUALITY_EXACT;
      }
      if (hay.startsWith(needle)) {
        best = Math.max(best, QUALITY_PREFIX);
      } else if (hay.includes(needle)) {
        best = Math.max(best, QUALITY_SUBSTRING);
      }
    }
  }
  if (best < QUALITY_WORD_PREFIX) {
    for (const word of field.words) {
      for (const needle of needles) {
        if (needle && word.length > needle.length && word.startsWith(needle)) {
          best = Math.max(best, QUALITY_WORD_PREFIX);
        }
      }
    }
  }
  if (best === 0) {
    const needle = token.fold;
    const max = maxFuzzyDistance(needle.length);
    if (max > 0) {
      for (const word of field.words) {
        if (boundedDistance(word, needle, max) <= max) {
          best = QUALITY_FUZZY;
          break;
        }
      }
    }
  }
  return best;
}

function tokenScore(token: QueryToken, fields: SearchField[]): number {
  let best = 0;
  for (const field of fields) {
    const quality = fieldQuality(field, token);
    if (quality > 0) {
      best = Math.max(best, field.weight * quality);
    }
  }
  return best;
}

function sortKey(property: CustomerProperty): string {
  return `${property.isActive === false ? 1 : 0}${property.city}${property.street}${property.customerNumber}`;
}

function defaultCompare(a: CustomerProperty, b: CustomerProperty): number {
  return sortKey(a).localeCompare(sortKey(b));
}

/**
 * Rank `list` against `query` and return the top `limit` matches.
 *
 * Empty query keeps the established order (active first, then city/street/number).
 * Otherwise every query word must match at least one field; results are ordered by
 * accumulated relevance score, falling back to the default order on ties.
 */
export function searchProperties(
  list: CustomerProperty[],
  query: string,
  limit: number,
): CustomerProperty[] {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return [...list].sort(defaultCompare).slice(0, limit);
  }

  const scored: Array<{ property: CustomerProperty; score: number }> = [];
  for (const property of list) {
    const fields = buildFields(property);
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = tokenScore(token, fields);
      if (score <= 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (!matchedAll) {
      continue;
    }
    if (property.isActive !== false) {
      total += 0.5; // nudge active properties above otherwise-equal inactive ones
    }
    scored.push({ property, score: total });
  }

  scored.sort((a, b) => b.score - a.score || defaultCompare(a.property, b.property));
  return scored.slice(0, limit).map((entry) => entry.property);
}
