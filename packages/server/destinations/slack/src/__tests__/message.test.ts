import { getEvent } from '@walkeros/core';
import { buildMessage, interpolate } from '../message';

describe('interpolate', () => {
  it('replaces ${data.field} from the event', () => {
    const event = getEvent('order complete', {
      data: { id: 'ORD-1', total: 50 },
    });
    expect(interpolate('Order ${data.id} for ${data.total}', event)).toBe(
      'Order ORD-1 for 50',
    );
  });

  it('leaves unknown paths as empty string', () => {
    const event = getEvent('order complete', {});
    expect(interpolate('User: ${user.email}', event)).toBe('User: ');
  });
});

describe('buildMessage', () => {
  const baseSettings = {
    unfurlLinks: false,
    unfurlMedia: false,
    mrkdwn: true,
    includeHeader: true,
  };

  it('uses interpolated text from rule.settings when provided', () => {
    const event = getEvent('order complete', {
      data: { id: 'ORD-1', total: 50 },
    });
    const msg = buildMessage(event, baseSettings, {
      text: 'Order ${data.id}: ${data.total}',
    });
    expect(msg.text).toBe('Order ORD-1: 50');
    expect(msg.blocks).toBeUndefined();
  });

  it('passes through rule.settings.blocks when provided', () => {
    const event = getEvent('order complete', { data: {} });
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hi' } }];
    const msg = buildMessage(event, baseSettings, { blocks });
    expect(msg.blocks).toEqual(blocks);
  });

  it('auto-generates default blocks when no text or blocks supplied', () => {
    const event = getEvent('lead submit', {
      data: { name: 'Acme', email: 'sales@acme.test' },
      source: { type: 'server', id: 'crm', previous_id: '' },
    });
    const msg = buildMessage(event, baseSettings, {});
    expect(msg.text).toBe('lead submit');
    expect(msg.blocks).toEqual([
      { type: 'header', text: { type: 'plain_text', text: 'lead submit' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*name:*\nAcme' },
          { type: 'mrkdwn', text: '*email:*\nsales@acme.test' },
        ],
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Source: crm' }],
      },
    ]);
  });
});
