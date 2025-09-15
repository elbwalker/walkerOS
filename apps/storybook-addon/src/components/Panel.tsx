import type {
  WalkerOSAddon,
  AttributeNode,
  WalkerEventWithGlobals,
} from '../types';
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
import { AttributeTreeView } from './AttributeTreeView';
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
    prefix: 'data-custom',
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
    globals: false,
  });

  const [events, setState] = useState<WalkerEventWithGlobals[]>([]);
  const [liveEvents, setLiveEvents] = useState<WalkerOS.Event[]>([]);
  const [attributeTree, setAttributeTree] = useState<AttributeNode[]>([]);

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
    [EVENTS.RESULT]: (newEvents: WalkerEventWithGlobals[]) => {
      setState(newEvents);
    },
    [EVENTS.LIVE_EVENT]: (event: WalkerOS.Event) => {
      setLiveEvents((prev) =>
        [{ ...event, timestamp: Date.now() }].concat(prev).slice(0, 50),
      );
    },
    [EVENTS.ATTRIBUTES_RESULT]: (tree: AttributeNode[]) => {
      setAttributeTree(tree);
    },
  });

  const updateEvents = useCallback(() => {
    emit(EVENTS.REQUEST, { ...config, highlights });
  }, [config, highlights, emit]);

  const updateAttributes = useCallback(() => {
    emit(EVENTS.ATTRIBUTES_REQUEST, { ...config, highlights });
  }, [config, highlights, emit]);

  // Initial auto-refresh on page load
  useEffect(() => {
    if (config.autoRefresh) {
      updateEvents();
      updateAttributes();
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

    // Combined update function for events and attributes
    const updateAll = () => {
      updateEvents();
      updateAttributes();
    };

    // Listen for story navigation and control changes
    storyEvents.forEach((event) => api.on(event, updateAll));
    // Cleanup listeners on unmount
    return () => storyEvents.forEach((event) => api.off(event, updateAll));
  }, [api, updateEvents, updateAttributes, config.autoRefresh]);

  const getEventTitle = (events: WalkerEventWithGlobals[]) => {
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

  const getAttributeTitle = () => {
    // Count all walker attributes (badges) across all nodes
    const countAttributes = (nodes: AttributeNode[]): number => {
      return nodes.reduce((total, node) => {
        let nodeAttributeCount = 0;

        // Count entity, action, context, globals
        if (node.attributes.entity) nodeAttributeCount++;
        if (node.attributes.action) nodeAttributeCount++;
        if (
          node.attributes.context &&
          Object.keys(node.attributes.context).length > 0
        ) {
          nodeAttributeCount++; // Count context as 1 attribute
        }
        if (
          node.attributes.globals &&
          Object.keys(node.attributes.globals).length > 0
        ) {
          nodeAttributeCount++; // Count globals as 1 attribute
        }

        // Count data properties (ignore custom properties like data-customproperty)
        if (node.attributes.properties) {
          const validProperties = Object.entries(
            node.attributes.properties,
          ).filter(([key, value]) => {
            // Skip empty objects and null/undefined values
            if (
              typeof value === 'object' &&
              value !== null &&
              Object.keys(value).length === 0
            )
              return false;
            return value !== null && value !== undefined && value !== '';
          });
          nodeAttributeCount += validProperties.length;
        }

        return (
          total + nodeAttributeCount + countAttributes(node.children || [])
        );
      }, 0);
    };

    const attributeCount = countAttributes(attributeTree);
    const form = attributeCount === 1 ? 'Attribute' : 'Attributes';
    return `${attributeCount} ${form}`;
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
        <div id="attributes" title={getAttributeTitle()}>
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
                <Button onClick={updateAttributes}>Update attributes</Button>
                <HighlightButtons
                  highlights={highlights}
                  toggleHighlight={toggleHighlight}
                />
              </div>
            </Fragment>
            <AttributeTreeView tree={attributeTree} />
          </Placeholder>
        </div>
      </TabsState>
    </AddonPanel>
  );
});
