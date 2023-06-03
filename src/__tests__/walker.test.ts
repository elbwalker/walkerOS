import { Walker } from '../types';
import { getEvents } from '../lib/walker';

import fs from 'fs';
const mockFn = jest.fn(); //.mockImplementation(console.log);

const html: string = fs
  .readFileSync(__dirname + '/html/walker.html')
  .toString();

beforeEach(() => {
  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;
  document.body.innerHTML = html;
  jest.clearAllMocks();
});

describe('Walker', () => {
  test('Basic collection', () => {
    expect(getEvents(getElem('basic'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Nested entites', () => {
    expect(getEvents(getElem('nested'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'mother',
        action: 'like',
        data: { label: 'grandmother' },
        trigger: Walker.Trigger.Load,
        nested: [
          { type: 'son', data: { interested_in: 'pizza' } },
          {
            type: 'daughter',
            data: { status: 'hungry' },
            nested: [{ type: 'baby', data: { status: 'infant' } }],
          },
          { type: 'baby', data: { status: 'infant' } },
        ],
      },
    ]);

    expect(getEvents(getElem('son'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'son',
        action: 'speak',
        data: { interested_in: 'pizza' },
      },
      { entity: 'mother', action: 'speak', data: { label: 'grandmother' } },
    ]);
  });

  test('Nested entites filtered', () => {
    expect(getEvents(getElem('daughter'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'daughter',
        action: 'care',
        data: { status: 'hungry' },
      },
    ]);
  });

  test('Nested entites filtered multiple', () => {
    expect(getEvents(getElem('baby'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'baby',
        action: 'play',
        data: { status: 'infant' },
      },
      { entity: 'mother', action: 'play', data: { label: 'grandmother' } },
    ]);
  });

  test('Quoted Properties', () => {
    expect(getEvents(getElem('properties'), Walker.Trigger.Load)).toMatchObject(
      [
        {
          entity: 'properties',
          action: 'act;ion',
          data: { foo: 'ba;r', key: 'value' },
        },
      ],
    );
    expect(
      getEvents(getElem('properties'), Walker.Trigger.Click),
    ).toMatchObject([
      {
        entity: 'properties',
        action: 'action;',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
  });

  test('No elbwalker attribute at clicked element', () => {
    expect(
      getEvents(getElem('click_test'), Walker.Trigger.Click),
    ).toMatchObject([
      {
        entity: 'click',
        action: 'test',
        data: {},
      },
    ]);
  });

  test('No action attribute at clicked element', () => {
    expect(getEvents(getElem('click_bubble'), Walker.Trigger.Click)).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element', () => {
    expect(
      getEvents(getElem('click_bubble_action'), Walker.Trigger.Click),
    ).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element and missing action attribute at parent', () => {
    expect(getEvents(getElem('click_invalid'), Walker.Trigger.Click)).toEqual(
      [],
    );
  });

  test('Missing action and property', () => {
    expect(getEvents(getElem('just_entity'), Walker.Trigger.Click)).toEqual([]);
  });

  test('Get nested child data properties with higher priority', () => {
    expect(
      getEvents(getElem('propert_priority'), Walker.Trigger.Click),
    ).toEqual([
      expect.objectContaining({
        entity: 'property',
        action: 'priority',
        data: { parent: 'property', prefere: 'deeper' },
      }),
    ]);
  });

  test('Dynamic values', () => {
    expect(getEvents(getElem('dynamic_values'), Walker.Trigger.Click)).toEqual([
      expect.objectContaining({
        action: 'click',
        entity: 'dynamic',
        data: {
          value_value: 'text',
          html: 'inner',
          id: 'id_value',
          static: 'value',
          option: 'choosen',
        },
      }),
    ]);
  });

  test('Prefix', () => {
    expect(
      getEvents(getElem('prefix'), Walker.Trigger.Load, 'elb'),
    ).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Context', () => {
    expect(getEvents(getElem('context'), Walker.Trigger.Click)).toMatchObject([
      {
        entity: 'e',
        action: 'click',
        context: {
          inside: ['entity', 0],
          recommendation: ['smart_ai', 1],
          same: ['level', 1],
          test: ['engagement', 2],
        },
      },
    ]);
  });

  test('Casting', () => {
    expect(getEvents(getElem('casting'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'types',
        action: 'cast',
        data: {
          string: 'text',
          empty: '',
          bool_true: true,
          bool_false: false,
          null: 0,
          int: 42,
          float: 13.37,
          negative: -3.14,
        },
      },
    ]);
  });

  test('Array properties', () => {
    expect(getEvents(getElem('array'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'array',
        action: 'props',
        data: {
          size: ['s', 'm', 'l'],
        },
      },
    ]);
  });

  test('Page entity as default', () => {
    expect(getEvents(getElem('no_entity'), Walker.Trigger.Click)).toMatchObject(
      [
        {
          entity: 'page',
          action: 'click',
          data: { e: 'v', p: 'v' },
          context: { k: ['c', 0] },
        },
      ],
    );
  });

  test('Generic properties', () => {
    expect(getEvents(getElem('generic'), Walker.Trigger.Click)).toMatchObject([
      {
        entity: 'generic',
        data: { p: 'v', k: 'v', g: 'v', o: 'v' },
      },
    ]);
  });

  test('Link', () => {
    const data = { k: 'v', l0: 0, l1: 1, l2: 2, l3: 3 };

    expect(
      getEvents(getElem('link-parent'), Walker.Trigger.Click),
    ).toMatchObject([{ entity: 'l', data }]);

    // expect(
    //   getEvents(getElem('link-child'), Walker.Trigger.Click),
    // ).toMatchObject([{ entity: 'l', data }]);
  });
});

function getElem(selector: string) {
  return document.getElementById(selector) as HTMLElement;
}
