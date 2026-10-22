import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationHotjar } from '..';
import { examples, schemas } from '../dev';

// The @hotjar/browser package is ESM -- stub the import so Jest can load it.
jest.mock('@hotjar/browser', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => true),
    event: jest.fn(() => true),
    identify: jest.fn(() => true),
    stateChange: jest.fn(() => true),
    isReady: jest.fn(() => true),
  },
}));

describe('hotjar conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationHotjar, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { siteId: 1234567 },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root: path.join(__dirname, '..', '..'),
    });
  });
});
