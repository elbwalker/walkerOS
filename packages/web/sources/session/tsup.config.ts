import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';

export default defineConfig([buildModules(), buildDev()]);
