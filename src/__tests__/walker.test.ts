import { Walker } from '../types';
import { walker } from '../lib/walker';

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
    expect(walker(getElem('basic'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Nested entites', () => {
    expect(walker(getElem('nested'), Walker.Trigger.Load)).toMatchObject([
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

    expect(walker(getElem('son'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'son',
        action: 'speak',
        data: { interested_in: 'pizza' },
      },
      { entity: 'mother', action: 'speak', data: { label: 'grandmother' } },
    ]);
  });

  test('Nested entites filtered', () => {
    expect(walker(getElem('daughter'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'daughter',
        action: 'care',
        data: { status: 'hungry' },
      },
    ]);
  });

  test('Nested entites filtered multiple', () => {
    expect(walker(getElem('baby'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'baby',
        action: 'play',
        data: { status: 'infant' },
      },
      { entity: 'mother', action: 'play', data: { label: 'grandmother' } },
    ]);
  });

  test('Quoted Properties', () => {
    expect(walker(getElem('properties'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'properties',
        action: 'act;ion',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
    expect(walker(getElem('properties'), Walker.Trigger.Click)).toMatchObject([
      {
        entity: 'properties',
        action: 'action;',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
  });

  test('No elbwalker attribute at clicked element', () => {
    expect(walker(getElem('click_test'), Walker.Trigger.Click)).toMatchObject([
      {
        entity: 'click',
        action: 'test',
        data: {},
      },
    ]);
  });

  test('No action attribute at clicked element', () => {
    expect(walker(getElem('click_bubble'), Walker.Trigger.Click)).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element', () => {
    expect(
      walker(getElem('click_bubble_action'), Walker.Trigger.Click),
    ).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element and missing action attribute at parent', () => {
    expect(walker(getElem('click_invalid'), Walker.Trigger.Click)).toEqual([]);
  });

  test('Missing action and property', () => {
    expect(walker(getElem('just_entity'), Walker.Trigger.Click)).toEqual([]);
  });

  test('Get nested child data properties with higher priority', () => {
    expect(walker(getElem('propert_priority'), Walker.Trigger.Click)).toEqual([
      expect.objectContaining({
        entity: 'property',
        action: 'priority',
        data: { parent: 'property', prefere: 'deeper' },
      }),
    ]);
  });

  test('Dynamic values', () => {
    expect(walker(getElem('dynamic_values'), Walker.Trigger.Click)).toEqual([
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
    expect(walker(getElem('prefix'), Walker.Trigger.Load, 'elb')).toMatchObject(
      [
        {
          entity: 'entity',
          action: 'action',
          data: { k: 'v' },
        },
      ],
    );
  });

  test('Context', () => {
    expect(walker(getElem('context'), Walker.Trigger.Click)).toMatchObject([
      {
        entity: 'e',
        action: 'click',
        context: {
          test: 'engagement',
          recommendation: 'smart_ai',
        },
      },
    ]);
  });

  test('Casting', () => {
    expect(walker(getElem('casting'), Walker.Trigger.Load)).toMatchObject([
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
    expect(walker(getElem('array'), Walker.Trigger.Load)).toMatchObject([
      {
        entity: 'array',
        action: 'props',
        data: {
          size: ['s', 'm', 'l'],
        },
      },
    ]);
  });
});

function getElem(selector: string) {
  return document.getElementById(selector) as HTMLElement;
}
