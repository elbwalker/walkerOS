import path from 'path';
import { conformance } from '@walkeros/collector/dev';
import { destinationBigQuery, destinationPubSub } from '..';
import { examples, pubsubExamples, schemas } from '../dev';

// The runs without env construct the SDK clients: keep them on the package's
// own SDK mocks, never a real Google endpoint.
jest.mock('@google-cloud/bigquery');
jest.mock('@google-cloud/bigquery-storage');
jest.mock('@google-cloud/pubsub');

const root = path.join(__dirname, '..', '..');

describe('gcp conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('bigquery conforms', async () => {
    await conformance('destination', destinationBigQuery, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings: { projectId: 'test-project' },
      env: { push: examples.env.push, simulation: examples.env.simulation },
      root,
    });
  });

  it('pubsub conforms', async () => {
    await conformance('destination', destinationPubSub, {
      profile: 'socket',
      examples: pubsubExamples.step,
      schema: schemas.pubsubSettings,
      settings: { projectId: 'test-project', topic: 'events' },
      env: {
        push: pubsubExamples.env.push,
        simulation: pubsubExamples.env.simulation,
      },
      root,
    });
  });
});
