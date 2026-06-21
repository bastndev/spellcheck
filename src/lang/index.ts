import type { LanguageCode } from '../languages';
import type { Dictionary } from '../types';
import { acceptSpanish } from './es';

/**
 * Returns true when `word` is correctly spelled for `language`.
 *
 * Spanish gets accent- and enclitic-aware handling. Every other language uses
 * plain membership (case-folded unless `caseSensitive` is set); the dictionary
 * wrapper already applies compound matching where the language needs it
 * (German).
 */
export function isAccepted(
  word: string,
  language: LanguageCode,
  dict: Dictionary,
  caseSensitive: boolean,
  acceptAccentOmissions: boolean,
): boolean {
  if (language === 'es') return acceptSpanish(word, dict, caseSensitive, acceptAccentOmissions);
  if (dict.has(word)) return true;
  if (!caseSensitive && dict.has(word.toLowerCase())) return true;
  return false;
}
