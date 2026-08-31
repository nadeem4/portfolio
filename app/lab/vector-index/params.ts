/** Index types this route can actually mount. IVF and HNSW join in later PRs. */
export const LAB_INDEXES = ['flat'] as const;
export type LabIndexName = (typeof LAB_INDEXES)[number];

export interface LabParams {
  readonly index: LabIndexName;
  readonly k: number;
}

export const DEFAULT_LAB_PARAMS: LabParams = { index: 'flat', k: 10 };

const MIN_K = 1;
const MAX_K = 20;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Read a deep link, once, on the server.
 *
 * These links are written by hand in Medium posts, so every field has to
 * survive a typo and a name that has not shipped yet without failing the page.
 */
export function parseLabParams(raw: Record<string, string | string[] | undefined> | undefined): LabParams {
  // `Number('')` is 0, not NaN, so an empty/missing param has to be rejected
  // before the numeric parse — otherwise it is indistinguishable from a
  // genuine `k=0`, which should clamp rather than fall back to the default.
  const rawKText = first(raw?.k);
  const rawK = rawKText === undefined || rawKText.trim() === '' ? NaN : Number(rawKText);
  const k = Number.isFinite(rawK) ? Math.min(Math.max(Math.round(rawK), MIN_K), MAX_K) : DEFAULT_LAB_PARAMS.k;

  const rawIndex = first(raw?.index);
  const index = LAB_INDEXES.find((name) => name === rawIndex) ?? DEFAULT_LAB_PARAMS.index;

  return { index, k };
}
