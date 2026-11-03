import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button';
import { EventLog, type EventLogProps, type EventLogRecord } from './EventLog';

const START = Date.UTC(2026, 0, 15, 9, 30, 0);

const base = {
  context: { shopping: ['discover', 0] },
  globals: { pagegroup: 'shop', language: 'en' },
  custom: {},
  user: { device: 'c3po', session: 's3ss10n' },
  nested: [],
  consent: { functional: true, marketing: false },
  source: {
    type: 'browser',
    id: 'https://example.com/shop/',
    previous_id: '',
  },
};

const PAGE_VIEW = {
  name: 'page view',
  data: { domain: 'example.com', title: 'Shop', id: '/shop/' },
  ...base,
  context: {},
  id: `${START}-gr0up-1`,
  trigger: 'load',
  entity: 'page',
  action: 'view',
  timestamp: START,
  timing: 0,
};

const PROMOTION_VISIBLE = {
  name: 'promotion visible',
  data: { name: 'Winter sale', slot: 'hero' },
  ...base,
  id: `${START + 1200}-gr0up-2`,
  trigger: 'visible',
  entity: 'promotion',
  action: 'visible',
  timestamp: START + 1200,
  timing: 1.2,
};

const PRODUCT_ADD = {
  name: 'product add',
  data: { id: 'sku-42', name: 'Everyday Backpack', price: 129, quantity: 1 },
  ...base,
  nested: [{ entity: 'size', data: { name: 'M' }, nested: [], context: {} }],
  id: `${START + 8400}-gr0up-3`,
  trigger: 'click',
  entity: 'product',
  action: 'add',
  timestamp: START + 8400,
  timing: 8.4,
};

const RECORDS: EventLogRecord[] = [
  { seq: 1, event: PAGE_VIEW },
  { seq: 2, event: PROMOTION_VISIBLE },
  { seq: 3, event: PRODUCT_ADD },
];

const meta: Meta<typeof EventLog> = {
  title: 'Design/Molecules/EventLog',
  component: EventLog,
  tags: ['autodocs'],
  // The log takes its size from the caller.
  args: { records: RECORDS, style: { height: 360 } },
};
export default meta;

/**
 * The caller holds the events and the selection. The log follows the newest
 * event; a click on an older row keeps that one, a click on the newest row
 * follows again. Clear empties the log.
 */
function Session(args: EventLogProps) {
  const [records, setRecords] = useState<EventLogRecord[]>([...args.records]);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [count, setCount] = useState(args.records.length);

  const send = () => {
    const seq = count + 1;
    const timestamp = START + seq * 3000;
    setCount(seq);
    setRecords((current) => [
      ...current,
      {
        seq,
        event: {
          ...PRODUCT_ADD,
          id: `${timestamp}-gr0up-${seq}`,
          timestamp,
          timing: (seq * 3000) / 1000,
        },
      },
    ]);
  };

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Button variant="secondary" onClick={send}>
        Send an event
      </Button>
      <EventLog
        {...args}
        style={{ ...args.style, width: '100%' }}
        records={records}
        selectedSeq={selectedSeq}
        onSelect={setSelectedSeq}
        onClear={() => {
          setRecords([]);
          setSelectedSeq(null);
        }}
      />
    </div>
  );
}

export const Default: StoryObj<typeof EventLog> = {
  render: (args) => <Session {...args} />,
};

/** Without `onSelect` the rows show the events but are disabled. */
export const Static: StoryObj<typeof EventLog> = {};

export const Empty: StoryObj<typeof EventLog> = {
  args: { records: [] },
};

/** Under 640px the list sits above the detail. */
export const Narrow: StoryObj<typeof EventLog> = {
  args: { style: { height: 560, width: 440 } },
  render: (args) => <Session {...args} />,
};
