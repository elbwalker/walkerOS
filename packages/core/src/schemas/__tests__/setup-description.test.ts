import { configJsonSchema as flowConfigJsonSchema } from '../flow';
import { configJsonSchema as destinationConfigJsonSchema } from '../destination';
import { configJsonSchema as storeConfigJsonSchema } from '../store';

// These descriptions render in the published flow schema (website
// static/schema/flow/v4.json), in IDE hints and in MCP: they must say what
// the collector does. `setup` runs only on `walkeros setup`, never while a
// step registers; a cache's `stop` defaults to true on sources, and `update`
// changes only a source's response.
describe('setup descriptions', () => {
  const SETUP =
    /^Provisioning options for `walkeros setup`, which runs only when invoked/;

  it.each([
    ['FlowSourceConfig', flowConfigJsonSchema],
    ['FlowDestinationConfig', flowConfigJsonSchema],
    ['FlowStoreConfig', flowConfigJsonSchema],
    ['DestinationConfig', destinationConfigJsonSchema],
    ['StoreConfig', storeConfigJsonSchema],
  ])('%s describes setup by when it runs', (definition, schema) => {
    expect(schema).toMatchObject({
      definitions: {
        [definition]: {
          properties: {
            setup: { description: expect.stringMatching(SETUP) },
          },
        },
      },
    });
  });
});

describe('event cache descriptions', () => {
  it.each([
    ['EventCacheConfig', 'stop', /sources default to true/],
    ['EventCacheRule', 'update', /^Source caches only: .* on HIT and MISS/],
  ])('%s.%s describes its behaviour', (definition, key, pattern) => {
    expect(flowConfigJsonSchema).toMatchObject({
      definitions: {
        [definition]: {
          properties: {
            [key]: { description: expect.stringMatching(pattern) },
          },
        },
      },
    });
  });
});
