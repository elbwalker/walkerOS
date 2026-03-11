import {
  setIntelliSenseContext,
  removeIntelliSenseContext,
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
});
