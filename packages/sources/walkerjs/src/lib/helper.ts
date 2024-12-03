import { Const } from '@elbwalker/utils';

export function isArgument(event?: unknown): event is IArguments {
  if (!event) return false;
  return {}.hasOwnProperty.call(event, 'callee');
}

export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

export function isElementOrDocument(elem: unknown): elem is Element {
  return elem === document || elem instanceof Element;
}
