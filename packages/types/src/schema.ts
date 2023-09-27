import type { Elbwalker } from '.';

export type Events = {
  [entity: string]: {
    [action: string]: Properties;
  };
};

export type Properties = {
  [key: string]: Property;
};

export type Property = {
  allowedKeys?: string[];
  allowedValues?: unknown[];
  maxLength?: number;
  max?: number;
  min?: number;
  optional?: boolean;
  schema?: Properties;
  strict?: boolean;
  type?: string;
  validate?: (
    value: unknown,
    key: string,
    event: Elbwalker.AnyObject,
  ) => Elbwalker.Property;
};
