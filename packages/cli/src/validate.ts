/**
 * The CLI-free validate entry. It imports no part of `src/index.ts`, so a
 * server process loads validation without the bundler (esbuild) or the package
 * manager (pacote).
 */
export { validate } from './commands/validate/index.js';
export { VALIDATE_CODES } from './commands/validate/types.js';
export type {
  ValidateResult,
  ValidationType,
  ValidationError,
  ValidationWarning,
  ValidateCode,
  ValidateCheck,
  ValidateScope,
  ValidateSkip,
  ValidateDeferred,
} from './commands/validate/types.js';
export type { ValidateOptions } from './schemas/validate.js';
