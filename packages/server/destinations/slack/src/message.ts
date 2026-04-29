import type { WalkerOS } from '@walkeros/core';
import type { Mapping, Settings, SlackBlock } from './types';

export interface BuiltMessage {
  text?: string;
  blocks?: SlackBlock[];
}

const TOKEN_RE = /\$\{([^}]+)\}/g;

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function interpolate(template: string, event: WalkerOS.Event): string {
  return template.replace(TOKEN_RE, (_, path: string) => {
    const value = getPath(event, path.trim());
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

export function buildMessage(
  event: WalkerOS.Event,
  settings: Partial<Settings>,
  rule: Partial<Mapping>,
): BuiltMessage {
  // 1. Custom blocks via rule
  if (rule.blocks && rule.blocks.length > 0) {
    const result: BuiltMessage = {
      blocks: interpolateBlocks(rule.blocks, event),
    };
    const text = rule.text ?? settings.text;
    if (text) result.text = interpolate(text, event);
    return result;
  }

  // 2. Custom text via rule (no blocks)
  const text = rule.text ?? settings.text;
  if (text) {
    return { text: interpolate(text, event) };
  }

  // 3. Destination-level blocks
  if (settings.blocks && settings.blocks.length > 0) {
    return { blocks: interpolateBlocks(settings.blocks, event) };
  }

  // 4. Auto-generated default blocks from event data
  return {
    text: event.name,
    blocks: defaultBlocks(event, settings.includeHeader !== false),
  };
}

function interpolateBlocks(
  blocks: SlackBlock[],
  event: WalkerOS.Event,
): SlackBlock[] {
  return JSON.parse(interpolate(JSON.stringify(blocks), event)) as SlackBlock[];
}

function defaultBlocks(
  event: WalkerOS.Event,
  includeHeader: boolean,
): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  if (includeHeader) {
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: event.name },
    });
  }

  const data = (event.data || {}) as Record<string, unknown>;
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => ({
      type: 'mrkdwn' as const,
      text: `*${key}:*\n${stringify(value)}`,
    }));

  if (fields.length > 0) {
    blocks.push({ type: 'section', fields });
  }

  const sourceType = event.source?.type;
  if (sourceType) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Source: ${sourceType}` }],
    });
  }

  return blocks;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
