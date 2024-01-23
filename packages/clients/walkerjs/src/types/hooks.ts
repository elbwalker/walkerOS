import type { Hooks } from '@elbwalker/types';
import { WebDestination } from '.';

export type Functions = Hooks.Functions & {
  preDestinationInit?: PreDestinationInit;
  postDestinationInit?: PostDestinationInit;
  preDestinationPush?: PreDestinationPush;
  postDestinationPush?: PostDestinationPush;
};

export type PreDestinationInit = Hooks.HookFn<
  NonNullable<WebDestination.Function['init']>
>;
export type PostDestinationInit = Hooks.HookFn<
  NonNullable<WebDestination.Function['init']>
>;
export type PreDestinationPush = Hooks.HookFn<WebDestination.Function['push']>;
export type PostDestinationPush = Hooks.HookFn<WebDestination.Function['push']>;
