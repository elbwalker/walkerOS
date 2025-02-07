import { Options, defineConfig } from 'tsup';

declare const config: Options;
declare const buildModules: (customConfig?: Partial<Options>) => Options;
declare const buildExamples: (customConfig?: Partial<Options>) => Options;
declare const buildBrowser: (customConfig?: Partial<Options>) => Options;
declare const buildES5: (customConfig?: Partial<Options>) => Options;

export {
  config,
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
};
