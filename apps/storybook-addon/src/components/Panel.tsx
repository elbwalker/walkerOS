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
import { formatEventTitle } from '../utils/formatEventTitle';

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
    prefix: 'data-elb',
    highlights: {
      context: false,
      entity: false,
      property: false,
      action: false,
    },
  };
  const config = {
    ...defaultConfig,
    ...globals[ADDON_ID],
    highlights: {
      ...defaultConfig.highlights,
      ...(globals[ADDON_ID]?.highlights || {}),
    },
  } as WalkerOSAddon;

  const [events, setState] = useState<Walker.Events>([]);
  const [liveEvents, setLiveEvents] = useState<WalkerOS.Event[]>([]);

  const updateConfig = (key: keyof WalkerOSAddon, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    updateGlobals({ [ADDON_ID]: newConfig });
  };

  const toggleHighlight = (type: keyof WalkerOSAddon['highlights']) => {
    const newHighlights = {
      ...config.highlights,
      [type]: !config.highlights?.[type],
    };
    const newConfig = { ...config, highlights: newHighlights };
    updateGlobals({ [ADDON_ID]: newConfig });

    // Send highlighting update to preview
    emit(EVENTS.HIGHLIGHT, newConfig);
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
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: theme.color.mediumdark,
                      marginRight: '8px',
                    }}
                  >
                    Highlight:
                  </span>
                  <Button
                    size="small"
                    variant={config.highlights?.context ? 'solid' : 'outline'}
                    onClick={() => toggleHighlight('context')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      backgroundColor: config.highlights?.context
                        ? '#ffbd44cc'
                        : 'transparent',
                      color: config.highlights?.context
                        ? '#000'
                        : theme.color.mediumdark,
                      border: `1px solid ${config.highlights?.context ? '#ffbd44' : theme.color.border}`,
                    }}
                  >
                    Context
                  </Button>
                  <Button
                    size="small"
                    variant={config.highlights?.entity ? 'solid' : 'outline'}
                    onClick={() => toggleHighlight('entity')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      backgroundColor: config.highlights?.entity
                        ? '#00ca4ecc'
                        : 'transparent',
                      color: config.highlights?.entity
                        ? '#fff'
                        : theme.color.mediumdark,
                      border: `1px solid ${config.highlights?.entity ? '#00ca4e' : theme.color.border}`,
                    }}
                  >
                    Entity
                  </Button>
                  <Button
                    size="small"
                    variant={config.highlights?.property ? 'solid' : 'outline'}
                    onClick={() => toggleHighlight('property')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      backgroundColor: config.highlights?.property
                        ? '#ff605ccc'
                        : 'transparent',
                      color: config.highlights?.property
                        ? '#fff'
                        : theme.color.mediumdark,
                      border: `1px solid ${config.highlights?.property ? '#ff605c' : theme.color.border}`,
                    }}
                  >
                    Property
                  </Button>
                  <Button
                    size="small"
                    variant={config.highlights?.action ? 'solid' : 'outline'}
                    onClick={() => toggleHighlight('action')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      backgroundColor: config.highlights?.action
                        ? '#9900ffcc'
                        : 'transparent',
                      color: config.highlights?.action
                        ? '#fff'
                        : theme.color.mediumdark,
                      border: `1px solid ${config.highlights?.action ? '#9900ff' : theme.color.border}`,
                    }}
                  >
                    Action
                  </Button>
                </div>
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
        <div id="config" title="Config">
          <Placeholder>
            <Fragment>
              <Form.Field label="Auto-refresh">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={config.autoRefresh}
                  onChange={(e) =>
                    updateConfig('autoRefresh', e.target.checked)
                  }
                />
              </Form.Field>
              <Form.Field label="Prefix">
                <Form.Input
                  name="Prefix"
                  value={config.prefix}
                  placeholder={config.prefix}
                  onChange={(e) =>
                    updateConfig('prefix', (e.target as HTMLInputElement).value)
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
