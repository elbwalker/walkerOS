import {
  eventAction,
  eventContext,
  eventEntity,
  eventGlobals,
  eventProperty,
} from '@walkeros/explorer/design';
import type { WalkerOSAddon } from '../types';

export type HighlightKind = keyof NonNullable<WalkerOSAddon['highlights']>;
export type AttributeKind =
  | 'entity'
  | 'action'
  | 'context'
  | 'globals'
  | 'data';

// Event colours of the walkerOS design system. They are made for dark
// grounds, so every use pairs them with the dark visualisation ground vizBg.
export const highlightColors: Record<HighlightKind, string> = {
  globals: eventGlobals,
  context: eventContext,
  entity: eventEntity,
  property: eventProperty,
  action: eventAction,
};

// Attribute badges name the property kind "data".
export const attributeColors: Record<AttributeKind, string> = {
  entity: highlightColors.entity,
  action: highlightColors.action,
  context: highlightColors.context,
  globals: highlightColors.globals,
  data: highlightColors.property,
};
