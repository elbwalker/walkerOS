/**
 * Monaco is a multi-megabyte download, so importing explorer must not load
 * it: it starts on the first editor mount, once for every editor on the page.
 *
 * The shared TypeScript setup (compiler options and the walkerOS ambient
 * globals) must still land once and before the first editor, or a diff's
 * models, exists: applying it under a running editor restarts the TypeScript
 * worker and cancels its pending work. A setup that throws must not stop the
 * rest of an editor's setup.
 */

// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// A fresh stand-in for the part of the Monaco API that the editors and their
// setup call. The setup remembers every instance it has prepared, so each
// test hands its own instance to the mocks below.
function createMonaco() {
  return {
    editor: { defineTheme: jest.fn(), setTheme: jest.fn() },
    languages: {
      registerDocumentFormattingEditProvider: jest.fn(),
      typescript: {
        ScriptTarget: { ES2022: 9 },
        ModuleResolutionKind: { NodeJs: 2 },
        ModuleKind: { ESNext: 99 },
        JsxEmit: { React: 2 },
        javascriptDefaults: {
          setCompilerOptions: jest.fn(),
          setDiagnosticsOptions: jest.fn(),
          addExtraLib: jest.fn(),
        },
        typescriptDefaults: {
          setCompilerOptions: jest.fn(),
          addExtraLib: jest.fn(),
        },
      },
    },
  };
}

const mockLoaded: { monaco: object } = { monaco: {} };
const mockCreated = jest.fn();

// Both editors keep the library's contract that `beforeMount` runs before
// the editor, or a diff's models, is created, and do both synchronously on
// mount: the earliest an editor could exist. The loader resolves on a later
// tick, as the real one does.
jest.mock('@monaco-editor/react', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  const Editor = ({
    beforeMount,
  }: {
    beforeMount?: (monaco: object) => void;
  }) => {
    ReactLocal.useEffect(() => {
      beforeMount?.(mockLoaded.monaco);
      mockCreated();
    }, []);
    return ReactLocal.createElement('div', { 'data-testid': 'monaco-editor' });
  };
  return {
    Editor,
    DiffEditor: Editor,
    loader: {
      config: () => {},
      init: jest.fn(() => Promise.resolve().then(() => mockLoaded.monaco)),
    },
    useMonaco: () => null,
  };
});

import React from 'react';
import { act, render } from '@testing-library/react';
import { loader } from '@monaco-editor/react';
import { Code } from '../code';
import { CodeDiff } from '../code-diff';

it('does not load Monaco when the module is imported', async () => {
  // Evaluate code.tsx and its mocked loader afresh.
  jest.resetModules();
  await import('../code');
  const fresh = await import('@monaco-editor/react');

  expect(fresh.loader.init).not.toHaveBeenCalled();
});

// The shared start lives in the module, so this must stay the first test to
// mount a Code.
it('loads Monaco once on the first editor mount and sets it up before any editor exists', async () => {
  const monaco = createMonaco();
  mockLoaded.monaco = monaco;
  const { typescriptDefaults, javascriptDefaults } =
    monaco.languages.typescript;

  const view = render(
    <>
      <Code code="const a = 1;" />
      <Code code="const b = 2;" />
    </>,
  );
  await act(async () => {});

  expect(loader.init).toHaveBeenCalledTimes(1);

  // An editor mounted after Monaco has loaded reuses the same start.
  view.rerender(
    <>
      <Code code="const a = 1;" />
      <Code code="const b = 2;" />
      <Code code="const c = 3;" />
    </>,
  );
  await act(async () => {});

  expect(loader.init).toHaveBeenCalledTimes(1);
  expect(mockCreated).toHaveBeenCalledTimes(3);
  expect(typescriptDefaults.setCompilerOptions).toHaveBeenCalledTimes(1);
  expect(typescriptDefaults.addExtraLib).toHaveBeenCalledTimes(1);
  expect(javascriptDefaults.addExtraLib).toHaveBeenCalledTimes(1);
  expect(
    typescriptDefaults.setCompilerOptions.mock.invocationCallOrder[0],
  ).toBeLessThan(mockCreated.mock.invocationCallOrder[0]);
});

it('finishes an editor setup when the TypeScript setup throws', () => {
  // A Monaco build without the TypeScript language.
  const monaco = {
    editor: createMonaco().editor,
    languages: { registerDocumentFormattingEditProvider: jest.fn() },
  };
  mockLoaded.monaco = monaco;
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const beforeMount = jest.fn();

  render(<Code code="const a = 1;" beforeMount={beforeMount} />);

  expect(monaco.editor.defineTheme).toHaveBeenCalled();
  expect(beforeMount).toHaveBeenCalledWith(monaco);
  expect(warn).toHaveBeenCalledWith(
    '[walkerOS] Monaco setup failed:',
    expect.any(TypeError),
  );
});

it('sets up Monaco before the models of a diff exist', () => {
  const monaco = createMonaco();
  mockLoaded.monaco = monaco;
  const { setCompilerOptions } = monaco.languages.typescript.typescriptDefaults;

  render(
    <CodeDiff
      original="const a = 1;"
      modified="const a = 2;"
      language="typescript"
    />,
  );

  expect(setCompilerOptions).toHaveBeenCalledTimes(1);
  expect(setCompilerOptions.mock.invocationCallOrder[0]).toBeLessThan(
    mockCreated.mock.invocationCallOrder[0],
  );
});
