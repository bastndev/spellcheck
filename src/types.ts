import type { LanguageCode } from './languages';

export interface SpellIssue {
  /** Character offset of the word in the checked text. */
  offset: number;
  /** Length of the flagged word. */
  length: number;
  /** The flagged word, exactly as it appeared. */
  word: string;
  /** Correction candidates, present only when `suggestions` is requested. */
  suggestions?: string[];
}

export interface CheckOptions {
  /** Dictionary to check against. Required. */
  language: LanguageCode;
  /** When true, dictionary lookups are case-sensitive. Default: false. */
  caseSensitive?: boolean;
  /**
   * Spanish-specific. When true, words missing an acute accent
   * (e.g. "codigo" for "código") are accepted as correct. Default: false.
   * No effect for any other language.
   */
  acceptAccentOmissions?: boolean;
  /**
   * @deprecated Removed in 3.0.0. Use `caseSensitive` and
   * `acceptAccentOmissions` instead.
   */
  strict?: boolean;
  /** Attach correction suggestions to every issue. Defaults to false. */
  suggestions?: boolean;
  /** Maximum suggestions per issue. Defaults to 5. */
  maxSuggestions?: number;
  /** Words shorter than this are never flagged. Defaults to 3. */
  minWordLength?: number;
  /** Words to always accept (case-insensitive), e.g. an app-specific allowlist. */
  ignoreWords?: Iterable<string>;
  /**
   * Words to always flag as misspelled (case-insensitive), even when the
   * dictionary contains them — e.g. your own list of common personal typos.
   * Applies unless the word is also in `ignoreWords` / `isProtectedWord`.
   */
  flagWords?: Iterable<string>;
  /** Custom predicate to skip a word before it is checked (e.g. protected terms). */
  isProtectedWord?: (word: string) => boolean;
  /**
   * Override or disable the protected-segment tokenizer pattern. See
   * `tokenize` for details. Defaults to the bundled default pattern.
   */
  protectedSegments?: RegExp | RegExp[] | false;
}

/** Options for `isCorrect` / bound checker `isCorrect`. */
export interface IsCorrectOptions {
  /** When true, dictionary lookups are case-sensitive. Default: false. */
  caseSensitive?: boolean;
  /**
   * Spanish-specific. When true, words missing an acute accent are accepted
   * as correct. Default: false. No effect for any other language.
   */
  acceptAccentOmissions?: boolean;
}

/** A loaded, decoded dictionary. Membership and suggestion lookups are synchronous. */
export interface Dictionary {
  /** True when the word is in the dictionary (compound-aware for German). */
  has(word: string): boolean;
  /** Correction candidates ordered best-first. */
  suggest(word: string, max?: number): string[];
}
