import React from 'react';
import { createRoot } from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import { MappingDemo } from '../src/components/demos/MappingDemo';

// Configure Monaco Editor workers for Vite
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

loader.config({ monaco });

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <MappingDemo />
  </React.StrictMode>,
);
