import type { Collector, Logger, Processor, WalkerOS } from '@walkeros/core';
import { processorValidator } from '../processor';
import type { ValidatorSettings } from '../types';

describe('Contract Integration Tests', () => {
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

  const createEvent = (
    entity: string,
    action: string,
    data: WalkerOS.Properties = {},
  ): WalkerOS.Event => ({
    name: `${entity} ${action}`,
    entity,
    action,
    data,
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Wildcard Matching', () => {
    it('should match entity.* wildcard', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              '*': {
                schema: {
                  properties: {
                    data: { required: ['id'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      // Any product action should match
      const viewEvent = createEvent('product', 'view', { id: '123' });
      const addEvent = createEvent('product', 'add', { id: '456' });

      expect(await processor.push(viewEvent, context)).toEqual(viewEvent);
      expect(await processor.push(addEvent, context)).toEqual(addEvent);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Contract validation passed',
        { rule: 'product *' },
      );
    });

    it('should match *.action wildcard when entity not in contract', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            '*': {
              purchase: {
                schema: {
                  properties: {
                    data: { required: ['value'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event = createEvent('item', 'purchase', { value: 100 });

      expect(await processor.push(event, context)).toEqual(event);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Contract validation passed',
        { rule: '* purchase' },
      );
    });

    it('should match *.* global fallback', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            '*': {
              '*': {
                schema: {
                  properties: {
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event = createEvent('anything', 'random', { foo: 'bar' });

      expect(await processor.push(event, context)).toEqual(event);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Contract validation passed',
        { rule: '* *' },
      );
    });

    it('should prefer exact match over wildcards', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: { required: ['id', 'name'] }, // Stricter
                  },
                },
              },
              '*': {
                schema: {
                  properties: {
                    data: { required: ['id'] }, // Less strict
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      // Missing 'name' should fail exact match
      const event = createEvent('product', 'view', { id: '123' });

      expect(await processor.push(event, context)).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Contract validation failed',
        expect.objectContaining({ rule: 'product view' }),
      );
    });
  });

  describe('Conditional Rules', () => {
    it('should use first matching condition', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              add: [
                {
                  condition: (event) => Number(event.data?.quantity ?? 0) > 10,
                  schema: {
                    properties: {
                      data: { required: ['id', 'quantity', 'warehouse'] },
                    },
                  },
                },
                {
                  // Default (no condition)
                  schema: {
                    properties: {
                      data: { required: ['id', 'quantity'] },
                    },
                  },
                },
              ],
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      // High quantity - needs warehouse
      const bulkEvent = createEvent('product', 'add', {
        id: '123',
        quantity: 15,
        warehouse: 'WH-1',
      });
      expect(await processor.push(bulkEvent, context)).toEqual(bulkEvent);

      // High quantity without warehouse - should fail
      const bulkEventNoWarehouse = createEvent('product', 'add', {
        id: '123',
        quantity: 15,
      });
      expect(await processor.push(bulkEventNoWarehouse, context)).toBe(false);

      // Low quantity - uses default rule
      const smallEvent = createEvent('product', 'add', {
        id: '456',
        quantity: 5,
      });
      expect(await processor.push(smallEvent, context)).toEqual(smallEvent);
    });

    it('should fall back to rule without condition', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              view: [
                {
                  condition: () => false, // Never matches
                  schema: {
                    properties: {
                      data: { required: ['never'] },
                    },
                  },
                },
                {
                  schema: {
                    properties: {
                      data: { required: ['id'] },
                    },
                  },
                },
              ],
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event = createEvent('product', 'view', { id: '123' });

      expect(await processor.push(event, context)).toEqual(event);
    });
  });

  describe('Lazy Compilation Caching', () => {
    it('should reuse compiled validators', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: { required: ['id'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event1 = createEvent('product', 'view', { id: '123' });
      const event2 = createEvent('product', 'view', { id: '456' });
      const event3 = createEvent('product', 'view', { id: '789' });

      // All should pass using the same cached validator
      expect(await processor.push(event1, context)).toEqual(event1);
      expect(await processor.push(event2, context)).toEqual(event2);
      expect(await processor.push(event3, context)).toEqual(event3);

      // Debug called 3 times with same rule
      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Contract validation passed',
        { rule: 'product view' },
      );
    });
  });

  describe('Pass-through Behavior', () => {
    it('should pass unmatched events through unchanged', async () => {
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

      // Different entity/action - no matching rule
      const event = createEvent('product', 'view', { anything: 'goes' });

      expect(await processor.push(event, context)).toEqual(event);
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should pass events when contract is not configured', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: false,
          // No contract
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event = createEvent('any', 'event', {});

      expect(await processor.push(event, context)).toEqual(event);
    });
  });

  describe('Combined Format and Contract', () => {
    it('should validate both format and contract', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: true,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: { required: ['id'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const event = createEvent('product', 'view', { id: '123' });

      expect(await processor.push(event, context)).toEqual(event);
    });

    it('should fail on format before reaching contract', async () => {
      const config: Processor.Config<Processor.Types<ValidatorSettings>> = {
        settings: {
          format: true,
          contract: {
            product: {
              view: {
                schema: {
                  properties: {
                    data: { required: ['id'] },
                  },
                },
              },
            },
          },
        },
      };
      const context = createContext(config);
      const processor = await processorValidator(context);

      const invalidEvent = {
        ...createEvent('product', 'view', { id: '123' }),
        name: 'invalid', // Bad format
      };

      expect(await processor.push(invalidEvent, context)).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event format invalid',
        expect.any(Object),
      );
      // Contract validation should not run
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });
});
