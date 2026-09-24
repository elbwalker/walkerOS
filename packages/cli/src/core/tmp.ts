/**
 * Temp path helpers live in `@walkeros/core/node`, shared with the runtime.
 * All temp files go to os.tmpdir() by default.
 */
export {
  getTmpPath,
  createTmpResolver,
  getDefaultTmpRoot,
  type TmpResolver,
} from '@walkeros/core/node';
