import type { WalkerOS } from '@elbwalker/types';
import { validateEvent } from '../core';

describe('validate', () => {
  test('validateEvent', () => {
    // should return valid event with missing properties filled
    expect(
      validateEvent({
        event: 'e a',
        data: { k: 'v' },
      }),
    ).toStrictEqual({
      event: 'e a',
      data: { k: 'v' },
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: {},
      id: '',
      trigger: '',
      entity: 'e',
      action: 'a',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: '',
      count: 0,
      version: { client: '', tagging: 0 },
      source: { type: '', id: '', previous_id: '' },
    });

    // should throw error for invalid event name
    expect(() =>
      validateEvent({
        event: 'e',
      }),
    ).toThrow('Invalid event name');

    // should throw error for missing event name
    expect(() =>
      validateEvent({
        data: { key: 'value' },
      }),
    ).toThrow('Missing or invalid event, entity, or action');

    // long event names
    expect(
      validateEvent({
        event: 'e ' + 'a'.repeat(256),
      }).event,
    ).toHaveLength(255);
    expect(() =>
      validateEvent(
        {
          event: 'e ' + 'a'.repeat(11),
        },
        [{ e: { '*': { event: { maxLength: 10, strict: true } } } }],
      ),
    ).toThrow('Value exceeds maxLength');

    // should throw error for invalid type
    expect(
      validateEvent({
        event: 'some event',
        data: 'invalid type',
      }),
    ).toHaveProperty('data', {});

    // should throw error for extra properties
    expect(() =>
      validateEvent({
        event: 'some event',
        extraProp: 'should not be here',
      }),
    ).not.toHaveProperty('extraProp');

    // should validate against custom contract
    const contract = [
      {
        e: {
          a: { data: { allowedKeys: ['k'] } },
          s: { data: { allowedKeys: ['k'], strict: true } },
        },
      },
    ];
    expect(
      validateEvent(
        {
          event: 'e a',
          data: { k: 'v', remove: 'me' },
        },
        contract,
      ).data,
    ).not.toHaveProperty('remove');
    expect(() =>
      validateEvent(
        {
          event: 'e s',
          data: { k: 'v', remove: 'me' },
        },
        contract,
      ),
    ).toThrow('Key not allowed');

    const requireContract = [{ p: { '*': { price: { required: true } } } }];
    expect(() =>
      validateEvent(
        {
          event: 'p r',
          data: {},
        },
        requireContract,
      ),
    ).toThrow('Missing required property');
    expect(
      validateEvent(
        {
          event: 'a n',
        },
        requireContract,
      ),
    ).toHaveProperty('data', {});

    // should remove unknown properties
    expect(
      validateEvent({
        event: 'some event',
        randomProp: 123, // doesn't belong here
      }),
    ).not.toHaveProperty('randomProp');

    // should throw error for invalid number range
    expect(
      validateEvent({
        event: 'e a',
        count: -1, // should be >= 0
      }),
    ).toHaveProperty('count', 0);

    // should apply custom validation logic
    const customValidationContract = [
      {
        entity: {
          throw: {
            event: {
              validate: (
                value: unknown,
                key: string,
                obj: WalkerOS.AnyObject,
              ) => {
                expect(value).toBe(obj[key]);
                throw new Error('Custom');
              },
            },
          },
          name: {
            event: {
              validate: () => {
                // With great power comes great responsibility...
                return 'invalideventname';
              },
            },
          },
          type: {
            data: {
              validate: () => {
                return false; // Should trigger type error
              },
            },
          },
        },
      },
    ];
    expect(() =>
      validateEvent({ event: 'entity throw' }, customValidationContract),
    ).toThrow('Custom');
    expect(
      validateEvent({ event: 'entity name' }, customValidationContract),
    ).toHaveProperty('event', 'invalideventname'); // If one really wants
    expect(
      validateEvent(
        { event: 'entity type', data: {} },
        customValidationContract,
      ),
    ).toHaveProperty('data', {}); // If one really wants

    // should validate wildcard rules
    expect(
      validateEvent({
        event: 'product add',
        data: { id: '123', price: 9.99 },
      }),
    ).toMatchObject({ event: 'product add', data: { id: '123', price: 9.99 } });

    const typeContract = {
      e: {
        a: {
          globals: {
            schema: {
              n: { type: 'number' },
            },
          },
        },
      },
    };

    expect(() =>
      validateEvent(
        {
          event: 'e a',
          globals: {
            n: 'no number',
          },
        },
        [typeContract],
      ),
    ).toThrow("Type doesn't match");
    expect(
      validateEvent(
        {
          event: 'e a',
          globals: {
            n: 1,
            k: 'v',
          },
        },
        [typeContract],
      ),
    ).toMatchObject({ event: 'e a' });
  });
});
