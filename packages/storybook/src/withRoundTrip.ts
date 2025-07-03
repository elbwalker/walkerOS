import type { WalkerOSAddon } from "src/types";
import type { DecoratorFunction } from "storybook/internal/types";
import { useChannel } from "storybook/preview-api";
import { getAllEvents } from "@elbwalker/walker.js";

import { EVENTS } from "./constants";

export const withRoundTrip: DecoratorFunction = (storyFn, context) => {
  const canvasElement = context.canvasElement as ParentNode;

  // Manual request via button click
  const emit = useChannel({
    [EVENTS.REQUEST]: (config: WalkerOSAddon) => {
      const events = getAllEvents(canvasElement as Element, config.prefix);
      emit(EVENTS.RESULT, events);
    },
  });

  return storyFn();
};
