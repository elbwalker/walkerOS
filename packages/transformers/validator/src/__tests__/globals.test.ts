import type { Collector, Logger, Transformer, WalkerOS } from '@walkeros/core';
import { transformerValidator } from '../transformer';
import type { ValidatorSettings } from '../types';

const mockLogger: Logger.Instance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn() as unknown as Logger.ThrowFn,
  json: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

const mockCollector = {} as Collector.Instance;

const createContext = (
  config: Transformer.Config<Transformer.Types<ValidatorSettings>>,
): Transformer.Context<Transformer.Types<ValidatorSettings>> => ({
  collector: mockCollector,
  config,
  env: {},
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
    group: 'test',
    count: 1,
    version: { source: 'test', tagging: 1 },
    source: { type: 'web', id: 'test', previous_id: '' },
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
    const instance = transformerValidator(createContext(config));
    const event = makeEvent({ globals: { country: 'DE' } });
    const result = await instance.push(event, {
      logger: mockLogger,
    } as any);
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
    const instance = transformerValidator(createContext(config));
    const event = makeEvent({ globals: {} });
    const result = await instance.push(event, {
      logger: mockLogger,
    } as any);
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
    const instance = transformerValidator(createContext(config));
    const event = makeEvent({ globals: { country: 123 } });
    const result = await instance.push(event, {
      logger: mockLogger,
    } as any);
    expect(result).toBe(false);
  });
});
