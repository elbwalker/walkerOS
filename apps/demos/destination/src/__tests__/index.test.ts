import { startFlow } from '@walkeros/collector';
import type { WalkerOS } from '@walkeros/core';
import { destinationDemo } from '../index';

describe('Demo Destination', () => {
  test('initializes and logs init message', () => {
    const mockLog = jest.fn();
    const mockCollector = {} as any;

    destinationDemo.init!({
      collector: mockCollector,
      config: { settings: { name: 'test' } },
      env: { log: mockLog },
    });

    expect(mockLog).toHaveBeenCalledWith('[test] initialized');
  });

  test('logs full event when values not specified', () => {
    const mockLog = jest.fn();
    const mockCollector = {} as any;

    const event: WalkerOS.Event = {
      name: 'page view',
      data: { title: 'Home' },
      timestamp: 1647261462000,
      id: '123',
      entity: 'page',
      action: 'view',
      trigger: 'test',
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      group: '123',
      count: 1,
      timing: 0,
      source: { type: 'test', id: '1', previous_id: '' },
      version: { source: 'test', tagging: 1 },
    };

    destinationDemo.push(event, {
      collector: mockCollector,
      config: { settings: { name: 'full' } },
      env: { log: mockLog },
    });

    expect(mockLog).toHaveBeenCalledTimes(1);
    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('[full]');
    expect(logCall).toContain('"name": "page view"');
    expect(logCall).toContain('"title": "Home"');
  });

  test('logs only specified values with dot notation', () => {
    const mockLog = jest.fn();
    const mockCollector = {} as any;

    const event: WalkerOS.Event = {
      name: 'page view',
      data: { title: 'Home', path: '/home' },
      timestamp: 1647261462000,
      id: '123',
      entity: 'page',
      action: 'view',
      trigger: 'test',
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      group: '123',
      count: 1,
      timing: 0,
      source: { type: 'test', id: '1', previous_id: '' },
      version: { source: 'test', tagging: 1 },
    };

    destinationDemo.push(event, {
      collector: mockCollector,
      config: {
        settings: {
          name: 'filtered',
          values: ['name', 'data.title', 'timestamp'],
        },
      },
      env: { log: mockLog },
    });

    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('[filtered]');
    expect(logCall).toContain('"name": "page view"');
    expect(logCall).toContain('"data.title": "Home"');
    expect(logCall).toContain('"timestamp": 1647261462000');
    expect(logCall).not.toContain('path');
    expect(logCall).not.toContain('entity');
  });

  test('handles nested paths correctly', () => {
    const mockLog = jest.fn();
    const mockCollector = {} as any;

    const event: WalkerOS.Event = {
      name: 'product view',
      data: {
        product: {
          name: 'Laptop',
          price: 999,
        },
        category: 'Electronics',
      },
      user: { id: 'U123' },
      timestamp: 1647261462000,
      id: '123',
      entity: 'product',
      action: 'view',
      trigger: 'test',
      context: {},
      custom: {},
      globals: {},
      nested: [],
      consent: {},
      group: '123',
      count: 1,
      timing: 0,
      source: { type: 'test', id: '1', previous_id: '' },
      version: { source: 'test', tagging: 1 },
    };

    destinationDemo.push(event, {
      collector: mockCollector,
      config: {
        settings: {
          values: ['user.id', 'data.product.name', 'data.product.price'],
        },
      },
      env: { log: mockLog },
    });

    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('"user.id": "U123"');
    expect(logCall).toContain('"data.product.name": "Laptop"');
    expect(logCall).toContain('"data.product.price": 999');
    expect(logCall).not.toContain('category');
  });

  test('uses console.log when env.log not provided', () => {
    const originalLog = console.log;
    console.log = jest.fn();
    const mockCollector = {} as any;

    const event: WalkerOS.Event = {
      name: 'test',
      timestamp: 1647261462000,
      id: '123',
      entity: 'test',
      action: 'test',
      trigger: 'test',
      data: {},
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      group: '123',
      count: 1,
      timing: 0,
      source: { type: 'test', id: '1', previous_id: '' },
      version: { source: 'test', tagging: 1 },
    };

    destinationDemo.push(event, {
      collector: mockCollector,
      config: {},
      env: {},
    });

    expect(console.log).toHaveBeenCalled();

    console.log = originalLog;
  });

  test('handles missing nested values gracefully', () => {
    const mockLog = jest.fn();
    const mockCollector = {} as any;

    const event: WalkerOS.Event = {
      name: 'test',
      data: { exists: true },
      timestamp: 1647261462000,
      id: '123',
      entity: 'test',
      action: 'test',
      trigger: 'test',
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      group: '123',
      count: 1,
      timing: 0,
      source: { type: 'test', id: '1', previous_id: '' },
      version: { source: 'test', tagging: 1 },
    };

    destinationDemo.push(event, {
      collector: mockCollector,
      config: {
        settings: {
          values: ['name', 'missing.path', 'data.missing'],
        },
      },
      env: { log: mockLog },
    });

    const logCall = mockLog.mock.calls[0][0];
    expect(logCall).toContain('"name": "test"');
    expect(logCall).not.toContain('missing');
  });
});
