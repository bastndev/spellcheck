import { checkText, isCorrect } from './checker';
import { loadDictionary, warmup } from './dictionary';
import type { LanguageCode } from './languages';
import type { CheckOptions, IsCorrectOptions, SpellIssue } from './types';

export { checkText, isCorrect } from './checker';
export { loadDictionary, warmup } from './dictionary';
export { tokenize, DEFAULT_PROTECTED_PATTERN } from './tokenize';
export { LANGUAGES, SUPPORTED_LANGUAGES, isSupportedLanguage } from './languages';
export type { LanguageCode, LanguageInfo } from './languages';
export type { CheckOptions, Dictionary, IsCorrectOptions, SpellIssue } from './types';

/** A checker bound to a single language, for convenient repeated use. */
export interface BoundChecker {
  readonly language: LanguageCode;
  check(text: string, options?: Omit<CheckOptions, 'language'>): Promise<SpellIssue[]>;
  suggest(word: string, max?: number): Promise<string[]>;
  isCorrect(word: string, options?: IsCorrectOptions): Promise<boolean>;
  warmup(): Promise<void>;
}

/**
 * Creates a checker locked to one language.
 *
 * ```ts
 * const es = createChecker('es');
 * const issues = await es.check('Este texto tiene un herror', { suggestions: true });
 * ```
 */
export function createChecker(language: LanguageCode): BoundChecker {
  return {
    language,
    check: (text, options) => checkText(text, { ...options, language }),
    suggest: async (word, max = 5) => (await loadDictionary(language)).suggest(word, max),
    isCorrect: (word, options) => isCorrect(word, language, options),
    warmup: () => warmup(language),
  };
}

/** Correction suggestions for a single word. */
export async function suggest(
  word: string,
  options: { language: LanguageCode; max?: number },
): Promise<string[]> {
  const dict = await loadDictionary(options.language);
  return dict.suggest(word, options.max ?? 5);
}
