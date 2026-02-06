import type { Transformer } from '@walkeros/core';

export interface Settings {
  fieldsToRedact?: string[];
  logRedactions?: boolean;
}

export interface Types extends Transformer.Types<Settings> {}
