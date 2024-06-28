import type { WalkerOS } from '@elbwalker/types';
import { Const, isSameType } from '@elbwalker/utils';

export function isArgument(event?: unknown): event is IArguments {
  if (!event) return false;
  return {}.hasOwnProperty.call(event, 'callee');
}

export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

export function isElementOrDocument(elem: unknown): elem is HTMLElement {
  return elem === document || elem instanceof HTMLElement;
}

export function isObject(obj: unknown): obj is WalkerOS.AnyObject {
  return isSameType(obj, {}) && !Array.isArray(obj) && obj !== null;
}
