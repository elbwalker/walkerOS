import type { WalkerOSAddon } from "src/types";
import type { Walker } from "@elbwalker/walker.js";
import React, { Fragment, memo, useCallback, useEffect, useState } from "react";
import {
  AddonPanel,
  Button,
  Checkbox,
  Form,
  SyntaxHighlighter,
} from "storybook/internal/components";
import { Placeholder, TabsState } from "storybook/internal/components";
import { useChannel, useGlobals, useStorybookApi } from "storybook/manager-api";
import { useTheme } from "storybook/theming";
import {
  STORY_ARGS_UPDATED,
  CURRENT_STORY_WAS_SET,
  SELECT_STORY,
  STORY_RENDERED,
} from "storybook/internal/core-events";

import { ADDON_ID, EVENTS } from "../constants";
import { List } from "./List";

interface PanelProps {
  active: boolean;
  walkerOSAddon: WalkerOSAddon;
}

export const Panel: React.FC<PanelProps> = memo(function MyPanel(props) {
  const theme = useTheme();
  const api = useStorybookApi();

  const [globals, updateGlobals] = useGlobals();

  const defaultConfig: WalkerOSAddon = {
    autoRefresh: true,
    prefix: "data-elb",
  };
  const config = {
    ...defaultConfig,
    ...globals[ADDON_ID],
  } as WalkerOSAddon;

  const [events, setState] = useState<Walker.Events>([]);

  const updateConfig = (key: keyof WalkerOSAddon, value: any) => {
    updateGlobals({ [ADDON_ID]: { ...config, [key]: value } });
  };

  // https://storybook.js.org/docs/react/addons/addons-api#usechannel
  const emit = useChannel({ [EVENTS.RESULT]: setState });

  const updateEvents = useCallback(() => {
    emit(EVENTS.REQUEST, config);
  }, [config, emit]);

  // Initial auto-refresh on page load
  useEffect(() => {
    if (config.autoRefresh) {
      updateEvents();
    }
  }, []); // Only run once on mount

  // Auto-refresh on story navigation and args updates
  useEffect(() => {
    if (!config.autoRefresh) return;

    // Events to listen for
    const storyEvents = [
      CURRENT_STORY_WAS_SET,
      SELECT_STORY,
      STORY_RENDERED,
      STORY_ARGS_UPDATED,
    ];

    // Listen for story navigation and control changes
    storyEvents.forEach((event) => api.on(event, updateEvents));
    // Cleanup listeners on unmount
    return () => storyEvents.forEach((event) => api.off(event, updateEvents));
  }, [api, updateEvents, config.autoRefresh]);

  const getEventTitle = (events: Walker.Events) => {
    const form = events.length == 1 ? "Event" : "Events";
    return `${events.length} ${form}`;
  };

  return (
    <AddonPanel {...props}>
      <TabsState initial="events" backgroundColor={theme.background.hoverable}>
        <div id="events" title={getEventTitle(events)}>
          <Placeholder>
            <Fragment>
              <Button onClick={updateEvents}>Update events</Button>
            </Fragment>
            {events.length > 0 ? (
              <List
                items={events.map((item, index) => ({
                  title: `#${index + 1} ${item.entity} ${item.action}`,
                  content: (
                    <SyntaxHighlighter
                      language="json"
                      copyable={true}
                      bordered={true}
                      padded={true}
                    >
                      {JSON.stringify(item, null, 2)}
                    </SyntaxHighlighter>
                  ),
                }))}
              />
            ) : (
              <p>No events yet</p>
            )}
          </Placeholder>
        </div>
        <div id="config" title="Config">
          <Placeholder>
            <Fragment>
              <Form.Field label="Auto-refresh">
                <Checkbox
                  id="autoRefresh"
                  checked={config.autoRefresh}
                  onChange={(e) =>
                    updateConfig("autoRefresh", e.target.checked)
                  }
                />
              </Form.Field>
              <Form.Field label="Prefix">
                <Form.Input
                  name="Prefix"
                  value={config.prefix}
                  placeholder={config.prefix}
                  onChange={(e) =>
                    updateConfig("prefix", (e.target as HTMLInputElement).value)
                  }
                  size="flex"
                />
              </Form.Field>
            </Fragment>
          </Placeholder>
        </div>
      </TabsState>
    </AddonPanel>
  );
});
