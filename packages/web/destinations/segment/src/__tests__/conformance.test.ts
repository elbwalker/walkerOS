import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { page } from '@walkeros/web-core/dev';
import { destinationSegment } from '..';
import { examples, schemas } from '../dev';
import type { SegmentStepExample } from '../examples/step';

const env = { push: examples.env.push, simulation: examples.env.simulation };

// The push examples that name vendor calls, each run with the settings and
// config it names; the init example runs in stepExamples.test.ts.
const { init: _init, ...pushExamples } = examples.step;
const sending = Object.entries<SegmentStepExample>(pushExamples).filter(
  ([, example]) => (example.out ?? []).length > 0,
);

// Analytics.js init options are forwarded into load() as a whole.
const passThrough = [
  'initialPageview',
  'disableClientPersistence',
  'disableAutoISOConversion',
  'retryQueue',
  'obfuscate',
  'integrations',
];

describe('segment conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationSegment, {
      profile: 'web-sdk',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: {
        apiKey: 'test-project',
        cdnURL: 'https://cdn.example.com',
        initialPageview: false,
        disableClientPersistence: true,
        disableAutoISOConversion: false,
        retryQueue: false,
        obfuscate: false,
        integrations: {},
      },
      minimal: examples.minimal,
      env,
      root: path.join(__dirname, '..', '..'),
      passThrough,
    });
  });

  it.each(sending)('records the calls %s names', async (name, example) => {
    await runExamples(
      'destination',
      destinationSegment,
      { [name]: example },
      {
        settings: { apiKey: 'test-project', ...example.settings },
        config: example.configInclude ? { include: example.configInclude } : {},
        env,
        page,
      },
    );
  });
});
