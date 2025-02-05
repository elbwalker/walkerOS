import { Const } from '@elbwalker/utils';

export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

export function isElementOrDocument(elem: unknown): elem is Element {
  return elem === document || elem instanceof Element;
}
