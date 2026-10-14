import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react';
import { EventLog } from '../EventLog';

const PAGE_VIEW = {
  name: 'page view',
  data: { id: '/shop/', title: 'Shop' },
  context: {},
  globals: { language: 'en' },
  custom: {},
  user: { device: 'd3v1c3' },
  nested: [],
  consent: { marketing: true },
  id: '1700000000000-gr0up-1',
  trigger: 'load',
  entity: 'page',
  action: 'view',
  timestamp: 1700000000000,
  timing: 0,
  source: { type: 'browser', id: 'https://demo.test/shop/' },
};

const PROMOTION_VISIBLE = {
  ...PAGE_VIEW,
  name: 'promotion visible',
  data: { name: 'Winter sale' },
  id: '1700000001200-gr0up-2',
  trigger: 'visible',
  entity: 'promotion',
  action: 'visible',
  timestamp: 1700000001200,
  timing: 1.2,
};

const PRODUCT_ADD = {
  ...PAGE_VIEW,
  name: 'product add',
  data: { name: 'Everyday Ruck Snack', price: 210, sale: true },
  context: { shopping: ['discover', 0] },
  nested: [{ entity: 'size', data: { name: 'M' }, nested: [], context: {} }],
  id: '1700000004200-gr0up-3',
  trigger: 'click',
  entity: 'product',
  action: 'add',
  timestamp: 1700000004200,
  timing: 4.2,
};

const RECORDS = [
  { seq: 1, event: PAGE_VIEW },
  { seq: 2, event: PROMOTION_VISIBLE },
  { seq: 3, event: PRODUCT_ADD },
];

/** The detail's sections as `[label, fields]`, each field as `[name, text]`. */
function sections(
  container: HTMLElement,
): Array<[string, Array<[string, string]>]> {
  return Array.from(
    container.querySelectorAll('.elb-event-log__section'),
    (section) => [
      section.querySelector('.elb-event-log__label')?.textContent ?? '',
      Array.from(section.querySelectorAll('.elb-event-log__field'), (field) => [
        field.querySelector('dt')?.textContent ?? '',
        field.querySelector('dd')?.textContent ?? '',
      ]),
    ],
  );
}

/** The field `name` of the section `label`. */
function field(container: HTMLElement, label: string, name: string) {
  const section = Array.from(
    container.querySelectorAll('.elb-event-log__section'),
  ).find(
    (candidate) =>
      candidate.querySelector('.elb-event-log__label')?.textContent === label,
  );
  return Array.from(
    section?.querySelectorAll('.elb-event-log__field') ?? [],
  ).find((candidate) => candidate.querySelector('dt')?.textContent === name);
}

// The clipboard promise settles in a microtask; act flushes the state update.
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

describe('EventLog', () => {
  const clipboard = navigator.clipboard;

  afterEach(() => {
    Object.assign(navigator, { clipboard });
  });

  it('lists the events newest first, each with its number, name and trigger', () => {
    const { container } = render(
      <EventLog records={RECORDS} onSelect={() => {}} />,
    );
    const rows = container.querySelectorAll('.elb-event-log__row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('#3');
    expect(rows[0]).toHaveTextContent('product add');
    expect(rows[0]).toHaveTextContent('click');
    expect(rows[2]).toHaveTextContent('#1');
    expect(rows[2]).toHaveTextContent('page view');
    expect(rows[2]).toHaveTextContent('load');
  });

  it('marks the entity and the action of an event name', () => {
    const { container } = render(<EventLog records={[RECORDS[2]]} />);
    for (const selector of [
      '.elb-event-log__row',
      '.elb-event-log__detail-name',
    ]) {
      const name = container.querySelector(selector);
      expect(name?.querySelector('.elb-event-log__entity')).toHaveTextContent(
        'product',
      );
      expect(name?.querySelector('.elb-event-log__action')).toHaveTextContent(
        'add',
      );
    }
  });

  it('shows the name as it is when it is not the entity and the action', () => {
    const { container } = render(
      <EventLog records={[{ seq: 1, event: { name: 'purchase' } }]} />,
    );
    const row = container.querySelector('.elb-event-log__row');
    expect(row).toHaveTextContent('purchase');
    expect(row?.querySelector('.elb-event-log__entity')).toBeNull();
  });

  it('follows the newest event without a selection', () => {
    const { container, getByRole } = render(
      <EventLog records={RECORDS} onSelect={() => {}} />,
    );
    expect(getByRole('button', { name: /product add/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getByRole('button', { name: /page view/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      container.querySelector('.elb-event-log__detail-name'),
    ).toHaveTextContent('product add');
  });

  it('shows the selected event', () => {
    const { container, getByRole } = render(
      <EventLog records={RECORDS} selectedSeq={1} onSelect={() => {}} />,
    );
    expect(getByRole('button', { name: /page view/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      container.querySelector('.elb-event-log__detail-name'),
    ).toHaveTextContent('page view');
  });

  it('heads the detail with the number, the trigger and the time', () => {
    const { container } = render(
      <EventLog records={RECORDS} selectedSeq={1} />,
    );
    expect(
      container.querySelector('.elb-event-log__meta')?.textContent,
    ).toMatch(/^#1 · load · \d\d:\d\d:\d\d$/);
  });

  it('calls onSelect with the number of a clicked event', () => {
    const onSelect = jest.fn();
    const { getByRole } = render(
      <EventLog records={RECORDS} onSelect={onSelect} />,
    );
    fireEvent.click(getByRole('button', { name: /page view/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('follows the newest again on a click on the newest event', () => {
    const onSelect = jest.fn();
    const { getByRole } = render(
      <EventLog records={RECORDS} selectedSeq={1} onSelect={onSelect} />,
    );
    fireEvent.click(getByRole('button', { name: /product add/ }));
    expect(onSelect.mock.calls).toEqual([[null]]);
  });

  // The bar holds the title, the count and Clear, in every state.
  it.each([
    ['following the newest', undefined],
    ['with an older event selected', 1],
  ])('adds nothing to the bar %s', (_state, selectedSeq) => {
    const { container } = render(
      <EventLog
        records={RECORDS}
        selectedSeq={selectedSeq}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    );
    expect(container.querySelector('.elb-event-log__bar')).toHaveTextContent(
      /^Events3Clear$/,
    );
  });

  it('disables the rows without onSelect', () => {
    const { getByRole } = render(<EventLog records={RECORDS} />);
    expect(getByRole('button', { name: /page view/ })).toBeDisabled();
  });

  it('shows data, context, globals, consent, user and nested as fields', () => {
    const { container, rerender } = render(<EventLog records={RECORDS} />);
    expect(sections(container).map(([label]) => label)).toEqual([
      'data',
      'context',
      'globals',
      'consent',
      'user',
      'nested',
    ]);
    expect(sections(container)[0]).toEqual([
      'data',
      [
        ['name', 'Everyday Ruck Snack'],
        ['price', '210'],
        ['sale', 'true'],
      ],
    ]);
    expect(sections(container)[3]).toEqual([
      'consent',
      [['marketing', 'granted']],
    ]);

    // An empty group is left out, but consent says that there is none.
    const event = { ...PAGE_VIEW, consent: {} };
    rerender(<EventLog records={[{ seq: 1, event }]} />);
    expect(sections(container).map(([label]) => label)).toEqual([
      'data',
      'globals',
      'consent',
      'user',
    ]);
    expect(
      container.querySelectorAll('.elb-event-log__section')[2],
    ).toHaveTextContent(/^consentnone$/);
  });

  it('colours a value by its type', () => {
    const { container } = render(<EventLog records={RECORDS} />);
    const kind = (label: string, name: string) =>
      field(container, label, name)?.querySelector('dd .elb-viz-tok');
    expect(kind('data', 'name')).toHaveClass('elb-viz-tok--str');
    expect(kind('data', 'price')).toHaveClass('elb-viz-tok--num');
    expect(kind('data', 'sale')).toHaveClass('elb-viz-tok--num');
    expect(kind('nested', '0')).toHaveClass('elb-viz-tok--text');
    expect(JSON.parse(kind('nested', '0')?.textContent ?? '')).toEqual(
      PRODUCT_ADD.nested[0],
    );
    expect(
      field(container, 'data', 'name')?.querySelector('dt .elb-viz-tok'),
    ).toHaveClass('elb-viz-tok--key');
  });

  it('shows a context value with its order', () => {
    const { container } = render(<EventLog records={RECORDS} />);
    const shopping = field(container, 'context', 'shopping');
    expect(shopping?.querySelector('dd .elb-viz-tok')).toHaveTextContent(
      'discover',
    );
    expect(shopping?.querySelector('.elb-event-log__sub')).toHaveTextContent(
      'order 0',
    );
  });

  it('shows the whole event as JSON, a field it does not know too', () => {
    const event = { ...PRODUCT_ADD, later: { added: true } };
    const { container, getByRole } = render(
      <EventLog records={[{ seq: 1, event }]} />,
    );
    expect(getByRole('button', { name: 'Fields' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('.elb-event-log__json')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'JSON' }));
    expect(getByRole('button', { name: 'JSON' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('.elb-event-log__section')).toBeNull();
    const json = container.querySelector('.elb-event-log__json');
    expect(JSON.parse(json?.textContent ?? '')).toEqual(event);
    expect(json?.querySelector('.elb-viz-tok--key')).toHaveTextContent(
      '"name"',
    );
    expect(json?.querySelector('.elb-viz-tok--str')).toHaveTextContent(
      '"product add"',
    );
    expect(json?.querySelector('.elb-viz-tok--num')).toHaveTextContent('210');
  });

  it('copies the selected event as JSON and confirms it', async () => {
    const writeText = jest.fn((_text: string) => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByRole } = render(
      <EventLog records={RECORDS} selectedSeq={1} />,
    );
    fireEvent.click(getByRole('button', { name: 'Copy' }));
    await settle();
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(PAGE_VIEW, null, 2));
    expect(getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(getByRole('status')).toHaveTextContent('Copied');
  });

  // A failed copy that said "Copied" would tell something that did not happen.
  it('says when the copy failed', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
    });
    const { getByRole } = render(<EventLog records={RECORDS} />);
    fireEvent.click(getByRole('button', { name: 'Copy' }));
    await settle();
    expect(getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
    expect(getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('counts the events', () => {
    const { container } = render(<EventLog records={RECORDS} />);
    expect(container.querySelector('.elb-event-log__count')).toHaveTextContent(
      '3',
    );
  });

  it('has a Clear button only with onClear and events, and it calls it', () => {
    const plain = render(<EventLog records={RECORDS} />);
    expect(plain.queryByRole('button', { name: 'Clear' })).toBeNull();
    plain.unmount();

    const empty = render(<EventLog records={[]} onClear={() => {}} />);
    expect(empty.queryByRole('button', { name: 'Clear' })).toBeNull();
    empty.unmount();

    const onClear = jest.fn();
    const { getByRole } = render(
      <EventLog records={RECORDS} onClear={onClear} />,
    );
    fireEvent.click(getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('says that there are no events, with a hint or what the caller says instead', () => {
    const plain = render(<EventLog records={[]} />);
    const empty = plain.container.querySelector('.elb-event-log__empty');
    expect(empty).toHaveTextContent('No events yet');
    expect(empty).toHaveTextContent('its events show up here');
    expect(plain.container.querySelector('.elb-event-log__list')).toBeNull();
    plain.unmount();

    const { container } = render(
      <EventLog records={[]} emptyText="The page sends no events." />,
    );
    expect(container.querySelector('.elb-event-log__empty')).toHaveTextContent(
      'No events yetThe page sends no events.',
    );
  });

  it('shows the time of an event from its timestamp', () => {
    const { container } = render(<EventLog records={[RECORDS[0]]} />);
    const row = container.querySelector<HTMLElement>('.elb-event-log__row');
    const time = row?.querySelector('time');
    expect(time).toHaveAttribute(
      'datetime',
      new Date(PAGE_VIEW.timestamp).toISOString(),
    );
    expect(row && within(row).getByText(/^\d\d:\d\d:\d\d$/)).toBe(time);
  });
});
