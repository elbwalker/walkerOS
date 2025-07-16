import { getAllEvents, getEvents, getGlobals } from '../walker';
import { Triggers } from '../trigger';
import fs from 'fs';

describe('Walker', () => {
  const html: string = fs
    .readFileSync(__dirname + '/html/walker.html')
    .toString();

  beforeEach(() => {
    document.body.innerHTML = html;
  });

  test('getAllEvents', () => {
    const events = getAllEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({
      entity: expect.any(String),
      action: expect.any(String),
      data: expect.any(Object),
    });
  });

  test('Basic collection', () => {
    expect(getEvents(getElem('basic'), Triggers.Load)).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Nested entities', () => {
    expect(getEvents(getElem('nested'), Triggers.Load)).toMatchObject([
      {
        entity: 'mother',
        action: 'like',
        data: { label: 'grandmother' },
        trigger: Triggers.Load,
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

    expect(getEvents(getElem('son'), Triggers.Load)).toMatchObject([
      {
        entity: 'son',
        action: 'speak',
        data: { interested_in: 'pizza' },
      },
      { entity: 'mother', action: 'speak', data: { label: 'grandmother' } },
    ]);
  });

  test('Nested entities filtered', () => {
    expect(getEvents(getElem('daughter'), Triggers.Load)).toMatchObject([
      {
        entity: 'daughter',
        action: 'care',
        data: { status: 'hungry' },
      },
    ]);
  });

  test('Nested entities filtered multiple', () => {
    expect(getEvents(getElem('baby'), Triggers.Load)).toMatchObject([
      {
        entity: 'baby',
        action: 'play',
        data: { status: 'infant' },
      },
      { entity: 'mother', action: 'play', data: { label: 'grandmother' } },
    ]);
  });

  test('Quoted Properties', () => {
    expect(getEvents(getElem('properties'), Triggers.Load)).toMatchObject([
      {
        entity: 'properties',
        action: 'act;ion',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
    expect(getEvents(getElem('properties'), Triggers.Click)).toMatchObject([
      {
        entity: 'properties',
        action: 'action;',
        data: { foo: 'ba;r', key: 'value' },
      },
    ]);
  });

  test('No walkerjs attribute at clicked element', () => {
    expect(getEvents(getElem('click_test'), Triggers.Click)).toMatchObject([
      {
        entity: 'click',
        action: 'test',
        data: {},
      },
    ]);
  });

  test('No action attribute at clicked element', () => {
    expect(getEvents(getElem('click_bubble'), Triggers.Click)).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element', () => {
    expect(getEvents(getElem('click_bubble_action'), Triggers.Click)).toEqual([
      expect.objectContaining({
        entity: 'click',
        action: 'test',
        data: { foo: 'bar', key: 'value' },
      }),
    ]);
  });

  test('Empty action attribute at clicked element and missing action attribute at parent', () => {
    expect(getEvents(getElem('click_invalid'), Triggers.Click)).toEqual([]);
  });

  test('Missing action and property', () => {
    expect(getEvents(getElem('just_entity'), Triggers.Click)).toEqual([]);
  });

  test('Data hierarchy', () => {
    const entity = 'e';
    const action = 'click';
    expect(getEvents(getElem('data_family'), Triggers.Click)).toMatchObject([
      {
        entity,
        action,
        data: { key: 'baz', scope: 'high' },
      },
    ]);
    expect(getEvents(getElem('data_parent'), Triggers.Click)).toMatchObject([
      {
        entity,
        action,
        data: { key: 'foo', scope: 'high' },
      },
    ]);
    expect(getEvents(getElem('data_child'), Triggers.Click)).toMatchObject([
      {
        entity,
        action,
        data: { key: 'bar', scope: 'low' },
      },
    ]);
    expect(getEvents(getElem('data_sibling'), Triggers.Click)).toMatchObject([
      {
        entity,
        action,
        data: { key: 'foo', scope: 'high' },
      },
    ]);
  });

  test('Dynamic values', () => {
    expect(getEvents(getElem('dynamic_values'), Triggers.Click)).toEqual([
      expect.objectContaining({
        action: 'click',
        entity: 'dynamic',
        data: {
          value_value: 'text',
          html: 'inner',
          id: 'id_value',
          static: 'value',
          option: 'chosen',
          checked: true,
          unchecked: false,
        },
      }),
    ]);
  });

  test('Prefix', () => {
    expect(getEvents(getElem('prefix'), Triggers.Load, 'elb')).toMatchObject([
      {
        entity: 'entity',
        action: 'action',
        data: { k: 'v' },
      },
    ]);
  });

  test('Context', () => {
    expect(getEvents(getElem('context'), Triggers.Click)).toMatchObject([
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
    expect(getEvents(getElem('casting'), Triggers.Load)).toMatchObject([
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
    expect(getEvents(getElem('array'), Triggers.Load)).toMatchObject([
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
    expect(getEvents(getElem('no_entity'), Triggers.Click)).toMatchObject([
      {
        entity: 'page',
        action: 'click',
        data: { e: 'v', p: 'v' },
        context: { k: ['c', 0] },
      },
    ]);
  });

  test('Generic properties', () => {
    expect(getEvents(getElem('generic'), Triggers.Click)).toMatchObject([
      {
        entity: 'generic',
        data: { p: 'v', k: 'v', g: 'v', o: 'v' },
      },
    ]);
  });

  test('Link', () => {
    const data = { k: 'v', l0: 0, l1: 1, l2: 2, l3: 3 };

    expect(getEvents(getElem('link-parent'), Triggers.Click)).toMatchObject([
      { entity: 'l', context: { entity: ['link', 0] }, data },
    ]);

    expect(getEvents(getElem('link-child'), Triggers.Click)).toMatchObject([
      {
        entity: 'n',
        action: 'click',
        data: { k: 'v' },
        trigger: 'click',
        context: {
          child: ['link', 0],
          parent: ['link', 1],
          entity: ['link', 2],
        },
        nested: [],
      },
      {
        entity: 'l',
        data,
        context: {
          child: ['link', 0],
          parent: ['link', 1],
          entity: ['link', 2],
        },
        nested: [{ type: 'n', data: { k: 'v' } }],
      },
    ]);
  });

  test('globalsStatic', () => {
    document.body.setAttribute('data-elbglobals', 'position:body');

    expect(getGlobals()).toStrictEqual({
      be: 'mindful',
      its: 'everywhere',
      position: 'body',
    });
  });

  test('Shadow DOM', () => {
    const shadowHostOpen = getElem('shadow-host-open');
    const shadowHostClosed = getElem('shadow-host-closed');
    const shadowRootOpen = shadowHostOpen.attachShadow({ mode: 'open' });
    const shadowRootClosed = shadowHostClosed.attachShadow({ mode: 'closed' });

    // Add content to shadow DOM
    const html = `<p id="shadow-action" data-elbaction="click"></p>`;
    shadowRootOpen.innerHTML = html;
    shadowRootClosed.innerHTML = html;

    expect(
      getEvents(
        shadowRootOpen.getElementById('shadow-action')!,
        Triggers.Click,
      ),
    ).toMatchObject([
      {
        entity: 'e',
        action: 'click',
        data: { k: 'v' },
      },
    ]);

    expect(
      getEvents(
        shadowRootClosed.getElementById('shadow-action')!,
        Triggers.Click,
      ),
    ).toMatchObject([
      {
        entity: 'e',
        action: 'click',
        data: { k: 'v' },
      },
    ]);
  });
});

function getElem(selector: string) {
  return document.getElementById(selector) as HTMLElement;
}
