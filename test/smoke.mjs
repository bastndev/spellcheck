import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import {
  DEFAULT_PROTECTED_PATTERN,
  SUPPORTED_LANGUAGES,
  checkText,
  createChecker,
  isCorrect,
  suggest,
  tokenize,
} from '../dist/index.js';

console.log('supported languages:', SUPPORTED_LANGUAGES.join(', '));

// The CJS build must load and expose the same API (this is what the VSCode
// extension's esbuild CJS host bundle will require()).
const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');
assert.equal(typeof cjs.checkText, 'function', 'CJS build exports checkText');
assert.ok(cjs.DEFAULT_PROTECTED_PATTERN instanceof RegExp, 'CJS build exposes DEFAULT_PROTECTED_PATTERN');

// --- A1: tokenizer + protected segments ----------------------------------
function tokensFor(text, protectedSegments) {
  return Array.from(tokenize(text, protectedSegments)).map((t) => t.word);
}

const defaultTokens = tokensFor('Visit https://example.com and `code` for more.');
assert.ok(!defaultTokens.includes('https'), 'default tokenizer skips URLs');
assert.ok(!defaultTokens.includes('code'), 'default tokenizer skips inline code');

// F1-specific markers no longer in the default pattern.
const f1Tokens = tokensFor('See [Image #1 cat] and [Skill #abc] now.');
assert.ok(f1Tokens.includes('Image') && f1Tokens.includes('cat'), 'default tokenizer no longer skips [Image #…]');

// `protectedSegments: false` disables protection entirely.
const noProtect = tokensFor('See [Image #1 dog].', false);
assert.ok(noProtect.includes('Image') && noProtect.includes('dog'), 'protectedSegments: false yields tokens inside [Image #…]');
const noProtectUrl = tokensFor('Open https://example.com', false);
assert.ok(noProtectUrl.includes('https'), 'protectedSegments: false also exposes URLs');

// Custom regex replaces the default.
const customOnly = tokensFor('foo bar https://example.com', [/foo/g]);
assert.ok(!customOnly.includes('foo'), 'custom regex skips foo');
assert.ok(customOnly.includes('https'), 'custom regex replaces the default (URLs are tokenized)');

// Composing the default with a custom regex.
const composed = tokensFor('foo bar https://example.com', [DEFAULT_PROTECTED_PATTERN, /foo/g]);
assert.ok(!composed.includes('foo'), 'composed: custom skip works');
assert.ok(!composed.includes('https'), 'composed: default still skips URLs');

// Non-global regexes are auto-wrapped — the original is not mutated.
const nonGlobal = /foo/;
const nonGlobalFlags = nonGlobal.flags;
const composedNonGlobal = tokensFor('foo foo bar', [nonGlobal]);
assert.equal(composedNonGlobal.filter((w) => w === 'foo').length, 0, 'non-global regex is auto-globalized (all matches skipped)');
assert.equal(nonGlobal.flags, nonGlobalFlags, 'non-global regex flags are not mutated');

// --- A2: language is required -------------------------------------------
// (TypeScript-level check noted in PR description; runtime keeps the explicit
// reject for unsupported codes.)
await assert.rejects(
  checkText('some text here', { language: 'ja' }),
  /unsupported language/i,
  'unsupported language rejects with a clear message',
);

// --- Spanish: default is strict; A3 opt-ins toggle leniency ---------------
assert.equal((await checkText('código', { language: 'es' })).length, 0, 'es: "código" is correct');
const esIssues = await checkText('Esto es un herror', { language: 'es', suggestions: true });
const herror = esIssues.find((i) => i.word === 'herror');
assert.ok(herror, 'es: "herror" is flagged');
console.log('es  "herror" ->', herror.suggestions);

// New default: accent omissions are flagged.
assert.ok(
  (await checkText('codigo', { language: 'es' })).length > 0,
  'es (default strict): "codigo" flagged',
);

// Opt in to accent leniency.
assert.equal(
  (await checkText('codigo', { language: 'es', acceptAccentOmissions: true })).length,
  0,
  'es with acceptAccentOmissions: "codigo" accepted',
);

// caseSensitive overrides accent leniency for words whose casing doesn't match
// dict canonical form. (Using "Codigo" rather than the all-caps "CODIGO" so
// the tokenizer's ACRONYM protection doesn't pre-empt the check.)
assert.ok(
  (await checkText('Codigo', { language: 'es', caseSensitive: true, acceptAccentOmissions: true })).length > 0,
  'es caseSensitive: "Codigo" still flagged even with accent leniency on',
);

// --- A3: legacy `strict` warns and behaves like documented mapping --------
{
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    // strict: true → new default behavior. "codigo" must be flagged.
    const issues = await checkText('codigo', { language: 'es', strict: true });
    assert.ok(issues.length > 0, 'legacy strict: true flags "codigo"');
    // strict: false on es → accent leniency. "codigo" accepted.
    const issues2 = await checkText('codigo', { language: 'es', strict: false });
    assert.equal(issues2.length, 0, 'legacy strict: false (es) accepts "codigo"');
  } finally {
    console.warn = origWarn;
  }
  assert.ok(
    warnings.some((w) => /strict.*deprecated/i.test(w)),
    'legacy strict emits a deprecation console.warn',
  );
}

// --- French --------------------------------------------------------------
assert.equal(await isCorrect('bonjour', 'fr'), true, 'fr: "bonjour" is correct');
assert.equal(await isCorrect('bonjoor', 'fr'), false, 'fr: "bonjoor" is a typo');
console.log('fr  "bonjoor" ->', await suggest('bonjoor', { language: 'fr', max: 3 }));

// --- German (compound matching enabled) ----------------------------------
assert.equal(await isCorrect('Haus', 'de'), true, 'de: "Haus" is correct');

// --- English -------------------------------------------------------------
assert.equal(await isCorrect('hello', 'en'), true, 'en: "hello" is correct');
assert.equal(await isCorrect('helo', 'en'), false, 'en: "helo" is a typo');
console.log('en  "helo"  ->', await suggest('helo', { language: 'en', max: 3 }));

// --- Russian -------------------------------------------------------------
assert.equal(await isCorrect('привет', 'ru'), true, 'ru: "привет" is correct');
assert.equal(await isCorrect('привед', 'ru'), false, 'ru: "привед" is a typo');

// --- Portuguese ----------------------------------------------------------
assert.equal(await isCorrect('obrigado', 'pt'), true, 'pt: "obrigado" is correct');
assert.equal(await isCorrect('obrigaado', 'pt'), false, 'pt: "obrigaado" is a typo');

// --- Arabic & Vietnamese load and return a verdict -----------------------
assert.equal(typeof (await isCorrect('عمل', 'ar')), 'boolean', 'ar: returns a verdict');
assert.equal(typeof (await isCorrect('việc', 'vi')), 'boolean', 'vi: returns a verdict');

// --- ignoreWords / flagWords ---------------------------------------------
assert.equal(
  (await checkText('Esto es un herror', { language: 'es', ignoreWords: ['herror'] })).length,
  0,
  'ignoreWords suppresses a flagged word',
);
const flagged = await checkText('Esta palabra es correcta', { language: 'es', flagWords: ['correcta'] });
assert.ok(flagged.some((i) => i.word === 'correcta'), 'flagWords flags a valid dictionary word');
assert.equal(
  (await checkText('palabra correcta', {
    language: 'es',
    flagWords: ['correcta'],
    ignoreWords: ['correcta'],
  })).length,
  0,
  'ignoreWords takes precedence over flagWords',
);

// --- Bound checker -------------------------------------------------------
const es = createChecker('es');
assert.equal(await es.isCorrect('palabra'), true, 'createChecker("es") works');
assert.equal(
  await es.isCorrect('codigo'),
  false,
  'bound es.isCorrect new default flags "codigo"',
);
assert.equal(
  await es.isCorrect('codigo', { acceptAccentOmissions: true }),
  true,
  'bound es.isCorrect with acceptAccentOmissions accepts "codigo"',
);

// --- A4: slim entry imports work and share dictionary cache ---------------
const slimEs = await import('../dist/es.js');
const slimEsIssues = await slimEs.check('Esto es un herror', { suggestions: true });
assert.ok(slimEsIssues.some((i) => i.word === 'herror'), 'fixnow/es slim build flags "herror"');
assert.equal(await slimEs.isCorrect('código'), true, 'fixnow/es slim build accepts "código"');
const slimEsSugg = await slimEs.suggest('herror', 3);
assert.ok(Array.isArray(slimEsSugg) && slimEsSugg.length > 0, 'fixnow/es slim build suggests');

const slimEn = await import('../dist/en.js');
assert.equal(await slimEn.isCorrect('hello'), true, 'fixnow/en slim build accepts "hello"');

// The dictionary cache is shared across copies via a globalThis symbol.
const sharedCache = globalThis[Symbol.for('fixnow.dictionaryCache.v2')];
assert.ok(sharedCache && sharedCache.has('es'), 'slim entry and main share the dictionary cache');

// CJS slim build also loads.
const slimEsCjs = require('../dist/es.cjs');
assert.equal(typeof slimEsCjs.check, 'function', 'fixnow/es CJS slim build exposes check');

console.log('\n✅ smoke test passed');
