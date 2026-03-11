import type { FileEnv } from '../types';

export const init: FileEnv | undefined = undefined;

export const push: FileEnv = {
  store: undefined,
  respond: undefined,
};

export const simulation = ['call:respond'];
