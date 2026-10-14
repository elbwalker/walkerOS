/**
 * A host that bundles the server has no node_modules to look the example up
 * in. Throwing module and file lookups stand in for that host: a resource that
 * reaches either at read time fails here.
 */
jest.mock('module', () => ({
  ...jest.requireActual<typeof import('module')>('module'),
  createRequire: () => {
    throw new Error('a runtime module lookup was made');
  },
}));
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  readFileSync: () => {
    throw new Error('a runtime file read was made');
  },
}));

import flowComplete from '@walkeros/cli/examples/flow-complete.json';
import { REFERENCE_RESOURCES } from '../../resources/references.js';

describe('examples reference resource', () => {
  it('answers the complete flow example without a runtime file lookup', async () => {
    const spec = REFERENCE_RESOURCES.find((s) => s.name === 'examples');
    if (!spec) throw new Error('examples missing');

    const content = await spec.read();

    expect(content.mimeType).toBe('application/json');
    const parsed: unknown = JSON.parse(content.text);
    expect(parsed).toMatchObject({
      version: 4,
      flows: {
        web: expect.any(Object),
        server: expect.any(Object),
        warehouse: expect.any(Object),
      },
    });
    expect(parsed).toEqual(flowComplete);
  });
});
