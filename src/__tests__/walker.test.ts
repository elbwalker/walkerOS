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
    expect(walker(getElem('basic'), 'load')).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Nested entites', () => {
    expect(walker(getElem('nested'), 'load')).toMatchObject([
      {
        entity: 'mother',
        action: 'like',
        data: { label: 'grandmother' },
        trigger: 'load',
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

    expect(walker(getElem('son'), 'load')).toMatchObject([
      {
        entity: 'son',
        action: 'speak',
        data: { interested_in: 'pizza' },
      },
      { entity: 'mother', action: 'speak', data: { label: 'grandmother' } },
    ]);
  });

  test('Nested entites filtered', () => {
    expect(walker(getElem('daughter'), 'load')).toMatchObject([
      {
        entity: 'daughter',
        action: 'care',
        data: { status: 'hungry' },
      },
    ]);
  });

  test('Nested entites filtered multiple', () => {
    expect(walker(getElem('baby'), 'load')).toMatchObject([
      {
        entity: 'baby',
        action: 'play',
        data: { status: 'infant' },
      },
      { entity: 'mother', action: 'play', data: { label: 'grandmother' } },
    ]);
  });

  test('Quoted Attributes', () => {
    expect(walker(getElem('attributes'), 'load')).toMatchObject([
      {
        entity: 'attributes',
        action: 'act;ion',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
    expect(walker(getElem('attributes'), 'click')).toMatchObject([
      {
        entity: 'attributes',
        action: 'action;',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
  });

  test('No elbwalker attribute at clicked element', () => {
    expect(walker(getElem('click_test'), 'click')).toMatchObject([
      {
        entity: 'click',
        action: 'test',
        data: {},
      },
    ]);
  });

  test('No action attribute at clicked element', () => {
    expect(walker(getElem('click_bubble'), 'click')).toEqual([
      {
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
        trigger: 'click',
        nested: [],
      },
    ]);
  });

  test('Empty action attribute at clicked element', () => {
    expect(walker(getElem('click_bubble_action'), 'click')).toEqual([
      {
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
        trigger: 'click',
        nested: [],
      },
    ]);
  });

  test('Empty action attribute at clicked element and missing action attribute at parent', () => {
    expect(walker(getElem('click_invalid'), 'click')).toEqual([]);
  });

  test('Missing action and property', () => {
    expect(walker(getElem('just_entity'), 'click')).toEqual([]);
  });

  test('Get nested child data properties with higher priority', () => {
    expect(walker(getElem('propert_priority'), 'click')).toEqual([
      {
        entity: 'property',
        action: 'priority',
        data: { parent: 'property', prefere: 'deeper' },
        trigger: 'click',
        nested: [],
      },
    ]);
  });

  test('Dynamic values', () => {
    expect(walker(getElem('dynamic_values'), 'click')).toEqual([
      {
        action: 'click',
        entity: 'dynamic',
        data: {
          value_value: 'text',
          html: 'inner',
          id: 'id_value',
          static: 'value',
          option: 'choosen',
        },
        trigger: 'click',
        nested: [],
      },
    ]);
  });

  test('Prefix', () => {
    expect(walker(getElem('prefix'), 'load', 'elb')).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });
});

function getElem(selector: string) {
  return document.getElementById(selector) as HTMLElement;
}
