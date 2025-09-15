import type { WalkerOSAddon } from '../types';
import type { Walker } from '@walkeros/web-core';
import type { WalkerOS } from '@walkeros/core';
import React, { Fragment, memo, useCallback, useEffect, useState } from 'react';
import {
  AddonPanel,
  Placeholder,
  TabsState,
  SyntaxHighlighter,
  Button,
  Form,
} from 'storybook/internal/components';
import { useChannel, useGlobals, useStorybookApi } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import {
  STORY_ARGS_UPDATED,
  CURRENT_STORY_WAS_SET,
  SELECT_STORY,
  STORY_RENDERED,
} from 'storybook/internal/core-events';

import { ADDON_ID, EVENTS } from '../constants';
import { List } from './List';
import { HighlightButtons } from './HighlightButtons';
import { formatEventTitle } from '../utils/formatEventTitle';

interface PanelProps {
  active: boolean;
  walkerOSAddon: WalkerOSAddon;
}

export const Panel: React.FC<PanelProps> = memo(function MyPanel(props) {
  const theme = useTheme();
  const api = useStorybookApi();
  const { parameters } = api.getCurrentStoryData() || {};

  const defaultConfig = {
    autoRefresh: true,
    prefix: 'data-elb',
  };

  const config = {
    ...defaultConfig,
    ...parameters?.[ADDON_ID],
  };

  // Highlights are now local state, not persistent config
  const [highlights, setHighlights] = useState({
    context: false,
    entity: false,
    property: false,
    action: false,
  });

  const [events, setState] = useState<Walker.Events>([]);
  const [liveEvents, setLiveEvents] = useState<WalkerOS.Event[]>([]);

  const toggleHighlight = (type: keyof typeof highlights) => {
    const newHighlights = {
      ...highlights,
      [type]: !highlights[type],
    };
    setHighlights(newHighlights);

    // Send highlighting update to preview with current config + highlights
    emit(EVENTS.HIGHLIGHT, { ...config, highlights: newHighlights });
  };

  // https://storybook.js.org/docs/react/addons/addons-api#usechannel
  const emit = useChannel({
    [EVENTS.RESULT]: (newEvents: Walker.Events) => {
      setState(newEvents);
    },
    [EVENTS.LIVE_EVENT]: (event: WalkerOS.Event) => {
      setLiveEvents((prev) =>
        [{ ...event, timestamp: Date.now() }].concat(prev).slice(0, 50),
      );
    },
  });

  const updateEvents = useCallback(() => {
    emit(EVENTS.REQUEST, { ...config, highlights });
  }, [config, highlights, emit]);

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
    const form = events.length == 1 ? 'Event' : 'Events';
    return `${events.length} ${form}`;
  };

  const getLiveEventTitle = () => {
    const form = liveEvents.length == 1 ? 'Event' : 'Events';
    return `${liveEvents.length} Live ${form}`;
  };

  const clearLiveEvents = () => {
    setLiveEvents([]);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <AddonPanel {...props}>
      <TabsState
        initial="live"
        backgroundColor={theme.background.hoverable as string}
      >
        <div id="events" title={getEventTitle(events)}>
          <Placeholder>
            <Fragment>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  padding: '8px',
                  backgroundColor: theme.background.app,
                  borderRadius: '4px',
                  border: `1px solid ${theme.color.border}`,
                }}
              >
                <Button onClick={updateEvents}>Update events</Button>
                <HighlightButtons
                  highlights={highlights}
                  toggleHighlight={toggleHighlight}
                />
              </div>
            </Fragment>
            {events.length > 0 ? (
              <List
                items={events.map((item, index) => {
                  return {
                    title: formatEventTitle(item, index),
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
                  };
                })}
              />
            ) : (
              <p>No events yet</p>
            )}
          </Placeholder>
        </div>
        <div id="live" title={getLiveEventTitle()}>
          <Placeholder>
            <Fragment>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  padding: '8px',
                  backgroundColor: theme.background.app,
                  borderRadius: '4px',
                  border: `1px solid ${theme.color.border}`,
                }}
              >
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <Button size="small" onClick={clearLiveEvents}>
                    Clear Events
                  </Button>
                </div>
                <HighlightButtons
                  highlights={highlights}
                  toggleHighlight={toggleHighlight}
                />
              </div>
            </Fragment>
            {liveEvents.length > 0 ? (
              <List
                items={liveEvents.map((event, index) => {
                  return {
                    title: formatEventTitle(
                      event,
                      liveEvents.length - index - 1,
                    ),
                    content: (
                      <SyntaxHighlighter
                        language="json"
                        copyable={true}
                        bordered={true}
                        padded={true}
                      >
                        {JSON.stringify(event, null, 2)}
                      </SyntaxHighlighter>
                    ),
                  };
                })}
              />
            ) : (
              <p
                style={{
                  textAlign: 'center',
                  color: theme.color.mediumdark,
                  padding: '20px',
                }}
              >
                Waiting for live events...
                <br />
                <small>
                  Interact with components to see events appear here in
                  real-time
                </small>
              </p>
            )}
          </Placeholder>
        </div>
      </TabsState>
    </AddonPanel>
  );
});
