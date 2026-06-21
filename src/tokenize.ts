// Segments that must never be flagged: code spans/blocks, URLs, emails, paths,
// CLI flags, hex colors, ACRONYMS, file names and dotted identifiers. Every
// branch here is language-agnostic, so it is safe across all dictionaries.
export const DEFAULT_PROTECTED_PATTERN =
  /```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s"'`<>]+|[\w.-]+@[\w.-]+\.\w{2,}|(?:\.{1,2}\/|~\/|\/)[^\s"'`<>]+|[A-Za-z]:\\[^\s"'`<>]+|#[0-9a-fA-F]{3,8}\b|\b[A-Z][A-Z0-9_]{1,}\b|(?<!\S)--?[A-Za-z][\w-]*(?:=[^\s"'`<>]+)?|\b(?:@[\w.-]+\/)?[\w.-]+@[\w.-]+\b|\b[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|html|css|scss|sass|md|mdx|svg|png|jpg|jpeg|gif|webp|yml|yaml|toml|env|lock)\b|\b[$A-Za-z_][\w$]*(?:[._:$][\w$-]+)+\b/g;

// Letters plus combining marks, so decomposed diacritics (Vietnamese, French)
// stay attached to their base letter rather than splitting the word.
const WORD_PATTERN = /[\p{L}\p{M}]+/gu;

export interface Token {
  word: string;
  offset: number;
}

/**
 * Yields candidate words from `text`, skipping anything inside a protected
 * segment.
 *
 * `protectedSegments` controls what is skipped:
 * - `undefined` (default) → the bundled {@link DEFAULT_PROTECTED_PATTERN}.
 * - `RegExp` / `RegExp[]` → use the given patterns instead of the default.
 *   Pass `[DEFAULT_PROTECTED_PATTERN, myPattern]` to compose.
 * - `false` → no segment protection at all.
 *
 * Non-global regexes are auto-wrapped with the `g` flag; originals are never
 * mutated.
 */
export function* tokenize(
  text: string,
  protectedSegments?: RegExp | RegExp[] | false,
): Generator<Token> {
  const protectedRanges: Array<[number, number]> = [];
  if (protectedSegments !== false) {
    const patterns =
      protectedSegments == null
        ? [DEFAULT_PROTECTED_PATTERN]
        : Array.isArray(protectedSegments)
          ? protectedSegments
          : [protectedSegments];
    for (const pattern of patterns) {
      const re = pattern.flags.includes('g')
        ? pattern
        : new RegExp(pattern.source, pattern.flags + 'g');
      for (const match of text.matchAll(re)) {
        const start = match.index ?? 0;
        protectedRanges.push([start, start + match[0].length]);
      }
    }
  }

  const isProtected = (offset: number): boolean =>
    protectedRanges.some(([start, end]) => offset >= start && offset < end);

  for (const match of text.matchAll(WORD_PATTERN)) {
    const offset = match.index ?? 0;
    if (isProtected(offset)) continue;
    yield { word: match[0], offset };
  }
}
