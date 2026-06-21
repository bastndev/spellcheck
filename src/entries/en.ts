import { createChecker } from '../index';

export const checker = createChecker('en');
export const { check, suggest, isCorrect, warmup } = checker;
export { DEFAULT_PROTECTED_PATTERN, LANGUAGES, tokenize } from '../index';
export type {
  BoundChecker,
  CheckOptions,
  Dictionary,
  IsCorrectOptions,
  LanguageInfo,
  SpellIssue,
} from '../index';
