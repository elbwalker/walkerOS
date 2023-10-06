import type { Elbwalker } from '.';

export type Contracts = Array<Contract>;

export type Contract = {
  [entity: string]: {
    [action: string]: Properties;
  };
};

export type Properties = {
  [key: string]: Property | undefined;
};

export type Property = {
  allowedKeys?: string[];
  allowedValues?: unknown[];
  // @TODO minLength?: number;
  maxLength?: number;
  max?: number;
  min?: number;
  required?: boolean;
  schema?: Properties;
  strict?: boolean;
  type?: string;
  validate?: (
    value: unknown,
    key: string,
    event: Elbwalker.AnyObject,
  ) => Elbwalker.Property;
};
