/**
 * EventFlow Component - Visualize and debug walkerOS events
 *
 * Features:
 * - Real-time event stream visualization
 * - Event filtering and search
 * - JSON inspection with syntax highlighting
 * - Event timeline and grouping
 * - Export functionality
 * - Performance metrics
 */

import { createComponent, type ComponentAPI } from '../core/Component';
import { createResultDisplay, type ResultDisplayAPI } from './ResultDisplay';
import { createElement, addEventListener, injectCSS } from '../utils/dom';
import { debounce } from '../utils/debounce';
import { highlightSyntax } from '../utils/syntax';

export interface WalkerEvent {
  event: string;
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  user?: Record<string, unknown>;
  nested?: WalkerEvent[];
  timestamp?: number;
  id?: string;
  source?: string;
  timing?: {
    trigger: number;
    processed: number;
    sent: number;
  };
}

export interface EventFlowOptions {
  maxEvents?: number;
  showTimeline?: boolean;
  showFilters?: boolean;
  showMetrics?: boolean;
  groupByEntity?: boolean;
  autoScroll?: boolean;
  height?: string;
  onEventCapture?: (event: WalkerEvent) => void;
  onEventSelect?: (event: WalkerEvent) => void;
  onExport?: (events: WalkerEvent[]) => void;
}

export interface EventFlowAPI extends ComponentAPI {
  addEvent(event: WalkerEvent): void;
  getEvents(): WalkerEvent[];
  clearEvents(): void;
  filterEvents(filter: string | RegExp): void;
  exportEvents(): WalkerEvent[];
  setGrouping(enabled: boolean): void;
  getMetrics(): EventMetrics;
}

interface EventMetrics {
  totalEvents: number;
  uniqueEvents: Set<string>;
  eventsPerSecond: number;
  averageProcessingTime: number;
  lastEventTime: number;
}

/**
 * Create an EventFlow component
 */
export function createEventFlow(
  elementOrSelector: HTMLElement | string,
  options: EventFlowOptions = {},
): EventFlowAPI {
  const baseComponent = createComponent(elementOrSelector, {
    autoMount: false,
  });

  const element = baseComponent.getElement()!;
  element.classList.add('explorer-eventflow');

  // Component state
  let events: WalkerEvent[] = [];
  let filteredEvents: WalkerEvent[] = [];
  let currentFilter = '';
  let groupByEntity = options.groupByEntity || false;
  let selectedEvent: WalkerEvent | null = null;
  let resultsDisplay: ResultDisplayAPI;

  // Metrics tracking
  let metrics: EventMetrics = {
    totalEvents: 0,
    uniqueEvents: new Set(),
    eventsPerSecond: 0,
    averageProcessingTime: 0,
    lastEventTime: 0,
  };

  // Cleanup functions
  const cleanupFunctions: Array<() => void> = [];

  // Debounced filter update
  const debouncedFilter = debounce(() => {
    updateEventList();
  }, 200);

  /**
   * Inject EventFlow CSS styles
   */
  function injectStyles(): void {
    const css = `
/* EventFlow Component Styles */
.explorer-eventflow {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--explorer-bg-primary);
  border: 1px solid var(--explorer-border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.explorer-eventflow__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--explorer-bg-secondary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 12px;
  color: var(--explorer-text-secondary);
}

.explorer-eventflow__title {
  font-weight: 600;
  color: var(--explorer-text-primary);
}

.explorer-eventflow__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.explorer-eventflow__filter {
  padding: 4px 8px;
  border: 1px solid var(--explorer-border-primary);
  border-radius: 4px;
  background: var(--explorer-bg-primary);
  color: var(--explorer-text-primary);
  font-size: 11px;
  width: 150px;
}

.explorer-eventflow__filter:focus {
  outline: none;
  border-color: var(--explorer-border-focus);
}

.explorer-eventflow__btn {
  background: none;
  border: 1px solid var(--explorer-border-secondary);
  color: var(--explorer-text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explorer-eventflow__btn:hover {
  background: var(--explorer-interactive-hover);
  color: var(--explorer-text-primary);
}

.explorer-eventflow__btn--active {
  background: var(--explorer-interactive-primary);
  color: var(--explorer-text-inverse);
  border-color: var(--explorer-interactive-primary);
}

.explorer-eventflow__content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.explorer-eventflow__timeline {
  width: 300px;
  background: var(--explorer-bg-primary);
  border-right: 1px solid var(--explorer-border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-eventflow__timeline-header {
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 11px;
  font-weight: 600;
  color: var(--explorer-text-secondary);
}

.explorer-eventflow__timeline-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.explorer-eventflow__event-item {
  padding: 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  border-left: 3px solid var(--explorer-interactive-primary);
  background: var(--explorer-bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.explorer-eventflow__event-item:hover {
  background: var(--explorer-interactive-hover);
}

.explorer-eventflow__event-item--selected {
  background: var(--explorer-interactive-primary);
  color: var(--explorer-text-inverse);
}

.explorer-eventflow__event-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.explorer-eventflow__event-meta {
  font-size: 10px;
  opacity: 0.8;
  display: flex;
  justify-content: space-between;
}

.explorer-eventflow__event-source {
  color: var(--explorer-text-muted);
}

.explorer-eventflow__event-time {
  font-family: monospace;
}

.explorer-eventflow__details {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-eventflow__details-header {
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary);
  border-bottom: 1px solid var(--explorer-border-primary);
  font-size: 11px;
  font-weight: 600;
  color: var(--explorer-text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.explorer-eventflow__details-content {
  flex: 1;
  overflow: hidden;
}

.explorer-eventflow__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--explorer-text-muted);
  font-style: italic;
  font-size: 14px;
}

.explorer-eventflow__metrics {
  padding: 8px 12px;
  background: var(--explorer-bg-tertiary);
  border-top: 1px solid var(--explorer-border-primary);
  font-size: 11px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.explorer-eventflow__metric {
  display: flex;
  flex-direction: column;
}

.explorer-eventflow__metric-label {
  color: var(--explorer-text-muted);
  font-weight: 500;
}

.explorer-eventflow__metric-value {
  color: var(--explorer-text-primary);
  font-weight: 600;
  font-family: monospace;
}

/* Event type styling */
.explorer-eventflow__event-item[data-event="page view"] {
  border-left-color: var(--explorer-interactive-success);
}

.explorer-eventflow__event-item[data-event^="click"] {
  border-left-color: var(--explorer-interactive-warning);
}

.explorer-eventflow__event-item[data-event^="form"] {
  border-left-color: var(--explorer-interactive-primary);
}

.explorer-eventflow__event-item[data-event^="custom"] {
  border-left-color: var(--explorer-syntax-keyword);
}

/* Responsive design */
@media (max-width: 768px) {
  .explorer-eventflow__content {
    flex-direction: column;
  }
  
  .explorer-eventflow__timeline {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--explorer-border-primary);
  }
  
  .explorer-eventflow__controls {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .explorer-eventflow__filter {
    width: 120px;
  }
}
`;

    injectCSS(css, 'explorer-eventflow-styles');
  }

  /**
   * Create the DOM structure
   */
  function createDOM(): void {
    element.innerHTML = '';

    // Create header
    const header = createElement('div', {
      className: 'explorer-eventflow__header',
    });

    const title = createElement('div', {
      className: 'explorer-eventflow__title',
      textContent: 'Event Flow',
    });

    const controls = createElement('div', {
      className: 'explorer-eventflow__controls',
    });

    // Filter input
    if (options.showFilters !== false) {
      const filterInput = createElement('input', {
        className: 'explorer-eventflow__filter',
        placeholder: 'Filter events...',
        type: 'text',
      }) as HTMLInputElement;

      const onFilter = () => {
        currentFilter = filterInput.value;
        debouncedFilter();
      };
      cleanupFunctions.push(addEventListener(filterInput, 'input', onFilter));

      controls.appendChild(filterInput);
    }

    // Group toggle
    const groupBtn = createElement('button', {
      className: `explorer-eventflow__btn ${groupByEntity ? 'explorer-eventflow__btn--active' : ''}`,
      textContent: 'Group',
    }) as HTMLButtonElement;

    const onGroup = () => {
      groupByEntity = !groupByEntity;
      groupBtn.classList.toggle(
        'explorer-eventflow__btn--active',
        groupByEntity,
      );
      updateEventList();
    };
    cleanupFunctions.push(addEventListener(groupBtn, 'click', onGroup));

    controls.appendChild(groupBtn);

    // Clear button
    const clearBtn = createElement('button', {
      className: 'explorer-eventflow__btn',
      textContent: 'Clear',
    }) as HTMLButtonElement;

    const onClear = () => {
      api.clearEvents();
    };
    cleanupFunctions.push(addEventListener(clearBtn, 'click', onClear));

    controls.appendChild(clearBtn);

    // Export button
    const exportBtn = createElement('button', {
      className: 'explorer-eventflow__btn',
      textContent: 'Export',
    }) as HTMLButtonElement;

    const onExport = () => {
      const exported = api.exportEvents();
      options.onExport?.(exported);
    };
    cleanupFunctions.push(addEventListener(exportBtn, 'click', onExport));

    controls.appendChild(exportBtn);

    header.appendChild(title);
    header.appendChild(controls);
    element.appendChild(header);

    // Create content container
    const content = createElement('div', {
      className: 'explorer-eventflow__content',
    });

    // Create timeline
    if (options.showTimeline !== false) {
      const timeline = createElement('div', {
        className: 'explorer-eventflow__timeline',
      });

      const timelineHeader = createElement('div', {
        className: 'explorer-eventflow__timeline-header',
        textContent: 'Events Timeline',
      });

      const timelineList = createElement('div', {
        className: 'explorer-eventflow__timeline-list',
        id: 'timeline-list',
      });

      timeline.appendChild(timelineHeader);
      timeline.appendChild(timelineList);
      content.appendChild(timeline);
    }

    // Create details section
    const details = createElement('div', {
      className: 'explorer-eventflow__details',
    });

    const detailsHeader = createElement('div', {
      className: 'explorer-eventflow__details-header',
    });
    detailsHeader.innerHTML =
      '<span>Event Details</span><span id="event-counter">0 events</span>';

    const detailsContent = createElement('div', {
      className: 'explorer-eventflow__details-content',
      id: 'details-content',
    });

    details.appendChild(detailsHeader);
    details.appendChild(detailsContent);
    content.appendChild(details);

    element.appendChild(content);

    // Create metrics section
    if (options.showMetrics !== false) {
      const metricsSection = createElement('div', {
        className: 'explorer-eventflow__metrics',
      });
      metricsSection.id = 'metrics-section';
      element.appendChild(metricsSection);
      updateMetrics();
    }

    // Initialize results display for details
    resultsDisplay = createResultDisplay(detailsContent, {
      showCopyButton: true,
      showTimestamps: false,
      height: '100%',
    });

    // Set height
    if (options.height) {
      element.style.height = options.height;
    }

    updateEventList();
  }

  /**
   * Update the event list display
   */
  function updateEventList(): void {
    const timelineList = element.querySelector('#timeline-list');
    const eventCounter = element.querySelector('#event-counter');

    if (!timelineList) return;

    // Apply filter
    filteredEvents = events.filter((event) => {
      if (!currentFilter) return true;

      const searchText = currentFilter.toLowerCase();
      return (
        event.event.toLowerCase().includes(searchText) ||
        JSON.stringify(event.data || {})
          .toLowerCase()
          .includes(searchText) ||
        (event.source || '').toLowerCase().includes(searchText)
      );
    });

    // Update counter
    if (eventCounter) {
      eventCounter.textContent = `${filteredEvents.length} events`;
    }

    // Clear timeline
    timelineList.innerHTML = '';

    if (filteredEvents.length === 0) {
      const empty = createElement('div', {
        className: 'explorer-eventflow__empty',
        textContent: 'No events captured',
      });
      timelineList.appendChild(empty);
      return;
    }

    // Group events if enabled
    const eventGroups = groupByEntity
      ? groupEventsByEntity(filteredEvents)
      : { 'All Events': filteredEvents };

    Object.entries(eventGroups).forEach(([groupName, groupEvents]) => {
      if (groupByEntity && Object.keys(eventGroups).length > 1) {
        const groupHeader = createElement('div', {
          className: 'explorer-eventflow__timeline-header',
          textContent: groupName,
          style: 'margin-top: 8px; padding: 4px 8px;',
        });
        timelineList.appendChild(groupHeader);
      }

      groupEvents.forEach((event) => {
        const eventItem = createEventItem(event);
        timelineList.appendChild(eventItem);
      });
    });

    // Auto-scroll to bottom
    if (options.autoScroll !== false) {
      timelineList.scrollTop = timelineList.scrollHeight;
    }
  }

  /**
   * Create an event item element
   */
  function createEventItem(event: WalkerEvent): HTMLElement {
    const item = createElement('div', {
      className: 'explorer-eventflow__event-item',
    });

    item.setAttribute('data-event', event.event);

    const eventName = createElement('div', {
      className: 'explorer-eventflow__event-name',
      textContent: event.event,
    });

    const eventMeta = createElement('div', {
      className: 'explorer-eventflow__event-meta',
    });

    const source = createElement('span', {
      className: 'explorer-eventflow__event-source',
      textContent: event.source || 'unknown',
    });

    const time = createElement('span', {
      className: 'explorer-eventflow__event-time',
      textContent: event.timestamp
        ? new Date(event.timestamp).toLocaleTimeString()
        : '',
    });

    eventMeta.appendChild(source);
    eventMeta.appendChild(time);

    item.appendChild(eventName);
    item.appendChild(eventMeta);

    // Click handler
    const onClick = () => {
      selectEvent(event);

      // Update selection visual
      const allItems = element.querySelectorAll(
        '.explorer-eventflow__event-item',
      );
      allItems.forEach((el) =>
        el.classList.remove('explorer-eventflow__event-item--selected'),
      );
      item.classList.add('explorer-eventflow__event-item--selected');
    };
    cleanupFunctions.push(addEventListener(item, 'click', onClick));

    return item;
  }

  /**
   * Group events by entity (data.entity or event prefix)
   */
  function groupEventsByEntity(
    events: WalkerEvent[],
  ): Record<string, WalkerEvent[]> {
    const groups: Record<string, WalkerEvent[]> = {};

    events.forEach((event) => {
      let groupKey = 'Other';

      // Try to get entity from data
      if (event.data?.entity && typeof event.data.entity === 'string') {
        groupKey = event.data.entity;
      } else {
        // Fallback to event prefix
        const parts = event.event.split(' ');
        if (parts.length > 1) {
          groupKey = parts.slice(0, -1).join(' ');
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    return groups;
  }

  /**
   * Select and display event details
   */
  function selectEvent(event: WalkerEvent): void {
    selectedEvent = event;

    // Clear previous results
    resultsDisplay.clear();

    // Add event details
    resultsDisplay.addValue(event.event, 'Event Name');

    if (event.data && Object.keys(event.data).length > 0) {
      resultsDisplay.addValue(event.data, 'Event Data');
    }

    if (event.context && Object.keys(event.context).length > 0) {
      resultsDisplay.addValue(event.context, 'Context');
    }

    if (event.globals && Object.keys(event.globals).length > 0) {
      resultsDisplay.addValue(event.globals, 'Globals');
    }

    if (event.user && Object.keys(event.user).length > 0) {
      resultsDisplay.addValue(event.user, 'User Data');
    }

    if (event.timing) {
      resultsDisplay.addValue(event.timing, 'Timing');
    }

    if (event.source) {
      resultsDisplay.addInfo(event.source, 'Source');
    }

    if (event.timestamp) {
      resultsDisplay.addInfo(
        new Date(event.timestamp).toISOString(),
        'Timestamp',
      );
    }

    if (event.nested && event.nested.length > 0) {
      resultsDisplay.addValue(event.nested, 'Nested Events');
    }

    // Emit selection event
    options.onEventSelect?.(event);
  }

  /**
   * Update metrics display
   */
  function updateMetrics(): void {
    const metricsSection = element.querySelector('#metrics-section');
    if (!metricsSection) return;

    // Calculate events per second
    const now = Date.now();
    const timeWindow = 10000; // 10 seconds
    const recentEvents = events.filter(
      (e) => e.timestamp && now - e.timestamp < timeWindow,
    );
    metrics.eventsPerSecond = recentEvents.length / (timeWindow / 1000);

    // Calculate average processing time
    const eventsWithTiming = events.filter(
      (e) => e.timing?.processed && e.timing?.trigger,
    );
    if (eventsWithTiming.length > 0) {
      const totalProcessingTime = eventsWithTiming.reduce(
        (sum, e) => sum + (e.timing!.processed - e.timing!.trigger),
        0,
      );
      metrics.averageProcessingTime =
        totalProcessingTime / eventsWithTiming.length;
    }

    metricsSection.innerHTML = `
      <div class="explorer-eventflow__metric">
        <span class="explorer-eventflow__metric-label">Total Events</span>
        <span class="explorer-eventflow__metric-value">${metrics.totalEvents}</span>
      </div>
      <div class="explorer-eventflow__metric">
        <span class="explorer-eventflow__metric-label">Unique Events</span>
        <span class="explorer-eventflow__metric-value">${metrics.uniqueEvents.size}</span>
      </div>
      <div class="explorer-eventflow__metric">
        <span class="explorer-eventflow__metric-label">Events/sec</span>
        <span class="explorer-eventflow__metric-value">${metrics.eventsPerSecond.toFixed(1)}</span>
      </div>
      <div class="explorer-eventflow__metric">
        <span class="explorer-eventflow__metric-label">Avg Processing</span>
        <span class="explorer-eventflow__metric-value">${metrics.averageProcessingTime.toFixed(1)}ms</span>
      </div>
    `;
  }

  // Enhanced API
  const api: EventFlowAPI = {
    ...baseComponent,

    addEvent(event: WalkerEvent): void {
      const enhancedEvent: WalkerEvent = {
        ...event,
        timestamp: event.timestamp || Date.now(),
        id:
          event.id ||
          `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      events.push(enhancedEvent);

      // Update metrics
      metrics.totalEvents = events.length;
      metrics.uniqueEvents.add(event.event);
      metrics.lastEventTime = enhancedEvent.timestamp!;

      // Limit events if specified
      if (options.maxEvents && events.length > options.maxEvents) {
        events = events.slice(-options.maxEvents);
        metrics.totalEvents = events.length;
      }

      updateEventList();
      updateMetrics();

      options.onEventCapture?.(enhancedEvent);
    },

    getEvents(): WalkerEvent[] {
      return [...events];
    },

    clearEvents(): void {
      events = [];
      filteredEvents = [];
      selectedEvent = null;
      metrics = {
        totalEvents: 0,
        uniqueEvents: new Set(),
        eventsPerSecond: 0,
        averageProcessingTime: 0,
        lastEventTime: 0,
      };

      updateEventList();
      updateMetrics();
      resultsDisplay.clear();
    },

    filterEvents(filter: string | RegExp): void {
      currentFilter = typeof filter === 'string' ? filter : filter.source;
      const filterInput = element.querySelector(
        '.explorer-eventflow__filter',
      ) as HTMLInputElement;
      if (filterInput) {
        filterInput.value = currentFilter;
      }
      updateEventList();
    },

    exportEvents(): WalkerEvent[] {
      return [...filteredEvents];
    },

    setGrouping(enabled: boolean): void {
      groupByEntity = enabled;
      const groupBtn = element.querySelector(
        '.explorer-eventflow__btn',
      ) as HTMLButtonElement;
      if (groupBtn) {
        groupBtn.classList.toggle('explorer-eventflow__btn--active', enabled);
      }
      updateEventList();
    },

    getMetrics(): EventMetrics {
      return { ...metrics };
    },

    destroy(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
      resultsDisplay?.destroy();
      baseComponent.destroy();
    },
  };

  // Initialize component
  injectStyles();
  createDOM();

  // Mount the base component
  api.mount();

  return api;
}
