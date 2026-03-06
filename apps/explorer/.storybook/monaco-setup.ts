import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * Configure Monaco Editor to load from local npm package instead of CDN
 * This configuration mirrors the main app setup in src/components/atoms/code.tsx
 *
 * Static imports ensure loader.config() executes synchronously before any
 * Editor components mount, preventing fallback to CDN loading.
 */

// Configure Monaco environment for Vite workers
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less')
      return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor')
      return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

// Configure loader to use local Monaco instance (prevents CDN loading)
loader.config({ monaco });
