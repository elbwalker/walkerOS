import type { Collector, Logger, Processor, WalkerOS } from '@walkeros/core';
import { processorValidator } from '../processor';
import type { ValidatorSettings } from '../types';

describe('Processor Validator', () => {
  const mockLogger: Logger.Instance = {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn() as unknown as Logger.ThrowFn,
    scope: jest.fn().mockReturnThis(),
  };

  const mockCollector = {} as Collector.Instance;

  const createContext = (
    config: Processor.Config<Processor.Types<ValidatorSettings>>,
  ): Processor.Context<Processor.Types<ValidatorSettings>> => ({
    collector: mockCollector,
    config,
    env: {},
    logger: mockLogger,
    id: 'test-processor',
  });

  const validEvent: WalkerOS.Event = {
    name: 'product view',
    entity: 'product',
    action: 'view',
    data: { id: '123', name: 'Test Product' },
    context: {},
    globals: {},
    custom: {},
    user: {},
    nested: [],
    consent: {},
    id: 'evt-123',
    trigger: 'click',
    timestamp: Date.now(),
    timing: 100,
    group: 'grp-123',
    count: 1,
    version: { source: '1.0.0', tagging: 1 },
    source: { type: 'web', id: 'src-123', previous_id: '' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Format Validation', () => {
    it('should pass valid events with format validation enabled', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: { format: true },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const result = await processor.push(validEvent, context);

      expect(result).toEqual(validEvent);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should reject invalid events with format validation', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: { format: true },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const invalidEvent = { ...validEvent, name: 'invalid' }; // Missing space

      const result = await processor.push(invalidEvent, context);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event format invalid',
        expect.objectContaining({ errors: expect.any(String) }),
      );
    });

    it('should skip format validation when disabled', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: { format: false },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const invalidEvent = { ...validEvent, name: 'invalid' };

      const result = await processor.push(invalidEvent, context);

      expect(result).toEqual(invalidEvent);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should enable format validation by default', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {},
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const invalidEvent = { ...validEvent, name: 'invalid' };

      const result = await processor.push(invalidEvent, context);

      expect(result).toBe(false);
    });
  });

  describe('Contract Validation', () => {
    it('should pass events matching contract schema', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: {
                      type: 'object',
                      required: ['id', 'name'],
                    },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const result = await processor.push(validEvent, context);

      expect(result).toEqual(validEvent);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Contract validation passed',
        { rule: 'product view' },
      );
    });

    it('should reject events failing contract schema', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: {
                      type: 'object',
                      required: ['id', 'name', 'price'], // price is missing
                    },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const result = await processor.push(validEvent, context);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Contract validation failed',
        expect.objectContaining({
          rule: 'product view',
          errors: expect.any(String),
        }),
      );
    });

    it('should pass unmatched events through', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            order: {
              complete: {
                schema: {
                  properties: {
                    data: { required: ['total'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      // product view doesn't match order complete
      const result = await processor.push(validEvent, context);

      expect(result).toEqual(validEvent);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
