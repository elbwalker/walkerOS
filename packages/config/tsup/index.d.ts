import { Options, defineConfig } from 'tsup';

declare const baseConfig: Options;
declare const buildModules: (customConfig?: Partial<Options>) => Options;
declare const buildExamples: (customConfig?: Partial<Options>) => Options;
declare const buildBrowser: (customConfig?: Partial<Options>) => Options;
declare const buildES5: (customConfig?: Partial<Options>) => Options;

export {
  baseConfig,
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
};
