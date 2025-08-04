// import type { ArgTypes } from "@storybook/react-vite";
// Using generic type to avoid dependency issues
type ArgTypes<T> = Record<keyof T, unknown>;

export interface WalkerOSAddon {
  autoRefresh: boolean;
  prefix?: string;
}

export interface WalkerOSTagging {
  elbEntity?: string;
  elbTrigger?: string;
  elbAction?: string;
  elbData?: string;
  elbContext?: string;
}

const category = '🏷️ walkerOS Tagging';

export const walkerOSArgTypes: ArgTypes<WalkerOSTagging> = {
  elbEntity: {
    name: 'Entity',
    description:
      'The main entity being tracked. This identifies what type of element is being interacted with.',
    control: {
      type: 'text',
    },
    table: {
      category,
      type: { summary: 'string' },
      defaultValue: { summary: 'undefined' },
    },
  },
  elbTrigger: {
    name: 'Trigger',
    description: 'The trigger that causes the event to fire.',
    control: { type: 'text' },
    table: {
      category,
      type: { summary: 'string' },
      defaultValue: { summary: 'undefined' },
    },
  },
  elbAction: {
    name: 'Action',
    description: 'The action being performed on the entity.',
    control: { type: 'text' },
    table: {
      category,
      type: { summary: 'string' },
      defaultValue: { summary: 'undefined' },
    },
  },
  elbData: {
    name: 'Data',
    description: 'Specify data properties that describe the entity.',
    control: { type: 'text' },
    table: {
      category,
      type: { summary: 'string' },
      defaultValue: { summary: 'undefined' },
    },
  },
  elbContext: {
    name: 'Context',
    description: 'Additional information that gets added to all nested events.',
    control: { type: 'text' },
    table: {
      category,
      type: { summary: 'string' },
      defaultValue: { summary: 'undefined' },
    },
    placeholder: 'key1:value1;key2:value2',
  },
};
