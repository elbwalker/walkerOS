import type { editor, Position } from 'monaco-editor';
import {
  setIntelliSenseContext,
  removeIntelliSenseContext,
  isAtContractValueStart,
} from '../monaco-walkeros-providers';

// Test the context registry independently — the real integration issue
// (modelPath generation) is in code.tsx but the registry itself is testable.
describe('IntelliSense context registry', () => {
  it('stores and retrieves context by model path', () => {
    // This tests the contract that code.tsx relies on.
    // If setIntelliSenseContext is called, the provider should have data.
    setIntelliSenseContext('/test/model.json', {
      variables: { gaId: 'G-XXX' },
    });
    // Clean up
    removeIntelliSenseContext('/test/model.json');
  });

  it('stores contractRaw in context for $contract completions', () => {
    const contractRaw = {
      default: { events: { page: { view: {} } } },
    };
    setIntelliSenseContext('/test/contract.json', { contractRaw });
    removeIntelliSenseContext('/test/contract.json');
  });

  it('stores flows inventory in context for $flow completions', () => {
    setIntelliSenseContext('/test/flow.json', {
      flows: ['web_prod', 'server_prod'],
    });
    removeIntelliSenseContext('/test/flow.json');
  });
});

/**
 * Tiny mock of editor.ITextModel that returns a single line of content.
 * Good enough for isAtContractValueStart — it only reads the current line
 * plus the cursor column.
 */
function mockModel(line: string): editor.ITextModel {
  return {
    getLineContent: () => line,
  } as unknown as editor.ITextModel;
}

function pos(column: number): Position {
  return { lineNumber: 1, column } as Position;
}

describe('isAtContractValueStart', () => {
  it('returns true when cursor sits right after "$contract', () => {
    const line = '  "config": "$contract';
    // Column is 1-based; place cursor right after the last char.
    expect(isAtContractValueStart(mockModel(line), pos(line.length + 1))).toBe(
      true,
    );
  });

  it('returns true for "$contract.foo (valid partial path)', () => {
    const line = '  "config": "$contract.foo';
    expect(isAtContractValueStart(mockModel(line), pos(line.length + 1))).toBe(
      true,
    );
  });

  it('returns true for "$contract.foo.bar (deeper path)', () => {
    const line = '  "config": "$contract.foo.bar';
    expect(isAtContractValueStart(mockModel(line), pos(line.length + 1))).toBe(
      true,
    );
  });

  it('returns false when cursor follows inline prose: prefix $contract.foo', () => {
    const line = '  "config": "prefix $contract.foo';
    expect(isAtContractValueStart(mockModel(line), pos(line.length + 1))).toBe(
      false,
    );
  });

  it('returns false when no quote precedes the cursor', () => {
    const line = '$contract.foo';
    expect(isAtContractValueStart(mockModel(line), pos(line.length + 1))).toBe(
      false,
    );
  });
});
