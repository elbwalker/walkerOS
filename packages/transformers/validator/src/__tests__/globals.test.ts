import type { Transformer, WalkerOS } from '@walkeros/core';
import { createMockContext, createMockLogger } from '@walkeros/core';
import { transformerValidator } from '../transformer';
import type { ValidatorSettings } from '../types';

const mockLogger = createMockLogger();

const createContext = (
  config: Transformer.Config<Transformer.Types<ValidatorSettings>>,
) =>
  createMockContext<Transformer.Types<ValidatorSettings>>({
    config,
    logger: mockLogger,
    id: 'test-transformer',
  });

function makeEvent(overrides: Partial<WalkerOS.Event> = {}): WalkerOS.Event {
  return {
    name: 'product view',
    entity: 'product',
    action: 'view',
    data: {},
    context: {},
    globals: {},
    custom: {},
    user: {},
    nested: [],
    consent: {},
    id: 'test-id',
    trigger: 'load',
    timestamp: Date.now(),
    timing: 0,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/',
      schema: '4',
    },
    ...overrides,
  };
}

describe('globals validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass when globals match schema', async () => {
    const config: Transformer.Config<Transformer.Types<ValidatorSettings>> = {
      settings: {
        format: false,
        globals: {
          type: 'object',
          required: ['country'],
          properties: {
            country: { type: 'string' },
          },
        },
      },
    };
    const instance = await transformerValidator(createContext(config));
    const event = makeEvent({ globals: { country: 'DE' } });
    const result = await instance.push(
      event,
      createMockContext({ logger: mockLogger }),
    );
    expect(result).toEqual({ event });
  });

  it('should fail when required global is missing', async () => {
    const config: Transformer.Config<Transformer.Types<ValidatorSettings>> = {
      settings: {
        format: false,
        globals: {
          type: 'object',
          required: ['country'],
          properties: {
            country: { type: 'string' },
          },
        },
      },
    };
    const instance = await transformerValidator(createContext(config));
    const event = makeEvent({ globals: {} });
    const result = await instance.push(
      event,
      createMockContext({ logger: mockLogger }),
    );
    expect(result).toBe(false);
  });

  it('should fail when global has wrong type', async () => {
    const config: Transformer.Config<Transformer.Types<ValidatorSettings>> = {
      settings: {
        format: false,
        globals: {
          type: 'object',
          properties: {
            country: { type: 'string' },
          },
        },
      },
    };
    const instance = await transformerValidator(createContext(config));
    const event = makeEvent({ globals: { country: 123 } });
    const result = await instance.push(
      event,
      createMockContext({ logger: mockLogger }),
    );
    expect(result).toBe(false);
  });
});
