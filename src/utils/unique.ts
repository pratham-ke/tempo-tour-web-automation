/**
 * Letters-only unique suffix for venue City / Name.
 *
 * The Show form uses jquery.alphanumeric: City (`alpha_space`) strips digits on blur.
 * A marker like "E2E" becomes "EE" and can fail server validation as an empty City.
 * The fallback pad is also letters-only (`ete…`) for the same reason.
 */
export function uniqueSuffix(): string {
  const raw = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const lettersOnly = raw.replace(/[^a-z]/gi, '');
  return lettersOnly.length >= 6 ? lettersOnly : `ete${lettersOnly}xyz`;
}
