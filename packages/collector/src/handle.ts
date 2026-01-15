import type { Collector, WalkerOS, Destination, Elb, On } from '@walkeros/core';
import { Const } from './constants';
import {
  addDestination,
  pushToDestinations,
  createPushResult,
} from './destination';
import { assign, getId, isFunction, isString } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { setConsent } from './consent';
import { on, onApply } from './on';
import type { RunState } from './types/collector';

/**
 * Handles common commands.
 *
 * @param collector The walkerOS collector instance.
 * @param action The action to handle.
 * @param data The data to handle.
 * @param options The options to handle.
 * @returns A promise that resolves with the push result or undefined.
 */
export async function commonHandleCommand(
  collector: Collector.Instance,
  action: string,
  data?: unknown,
  options?: unknown,
): Promise<Elb.PushResult> {
  let result: Elb.PushResult | undefined;
  switch (action) {
    case Const.Commands.Config:
      if (isObject(data)) {
        assign(collector.config, data as Partial<Collector.Config>, {
          shallow: false,
        });
      }
      break;

    case Const.Commands.Consent:
      if (isObject(data)) {
        result = await setConsent(collector, data as WalkerOS.Consent);
      }
      break;

    case Const.Commands.Custom:
      if (isObject(data)) {
        collector.custom = assign(
          collector.custom,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.Destination:
      if (isObject(data) && isFunction(data.push)) {
        result = await addDestination(
          collector,
          { code: data as unknown as Destination.Instance },
          options as Destination.Config,
        );
      }
      break;

    case Const.Commands.Globals:
      if (isObject(data)) {
        collector.globals = assign(
          collector.globals,
          data as WalkerOS.Properties,
        );
      }
      break;

    case Const.Commands.On:
      if (isString(data)) {
        on(
          collector,
          data as On.Types,
          options as WalkerOS.SingleOrArray<On.Options>,
        );
      }
      break;

    case Const.Commands.Ready:
      onApply(collector, 'ready');
      break;

    case Const.Commands.Run:
      result = await runCollector(collector, data as RunState);
      break;

    case Const.Commands.Session:
      onApply(collector, 'session');
      break;

    case Const.Commands.User:
      if (isObject(data)) {
        assign(collector.user, data as WalkerOS.User, { shallow: false });
      }
      break;
  }

  return result || createPushResult({ ok: true });
}

/**
 * Creates a full event from a partial event.
 *
 * @param collector The walkerOS collector instance.
 * @param partialEvent The partial event to transform.
 * @returns The full event.
 */
export function createEvent(
  collector: Collector.Instance,
  partialEvent: WalkerOS.PartialEvent,
): WalkerOS.Event {
  if (!partialEvent.name) throw new Error('Event name is required');

  const [entityValue, actionValue] = partialEvent.name.split(' ');
  if (!entityValue || !actionValue) throw new Error('Event name is invalid');

  ++collector.count;

  const {
    timestamp = Date.now(),
    group = collector.group,
    count = collector.count,
  } = partialEvent;

  const {
    name = `${entityValue} ${actionValue}`,
    data = {},
    context = {},
    globals = collector.globals,
    custom = {},
    user = collector.user,
    nested = [],
    consent = collector.consent,
    id = `${timestamp}-${group}-${count}`,
    trigger = '',
    entity = entityValue,
    action = actionValue,
    timing = 0,
    version = {
      source: collector.version,
      tagging: collector.config.tagging || 0,
    },
    source = { type: 'collector', id: '', previous_id: '' },
  } = partialEvent;

  return {
    name,
    data,
    context,
    globals,
    custom,
    user,
    nested,
    consent,
    id,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    group,
    count,
    version,
    source,
  };
}

/**
 * Runs the collector by setting it to allowed state and processing queued events.
 *
 * @param collector The walkerOS collector instance.
 * @param state Optional state to merge with the collector (user, globals, consent, custom).
 * @returns A promise that resolves with the push result.
 */
export async function runCollector(
  collector: Collector.Instance,
  state?: RunState,
): Promise<Elb.PushResult> {
  // Set the collector to allowed state
  collector.allowed = true;

  // Reset count and generate new group ID
  collector.count = 0;
  collector.group = getId();

  // Update timing for this run
  collector.timing = Date.now();

  // Update collector state if provided
  if (state) {
    // Update consent if provided
    if (state.consent) {
      collector.consent = assign(collector.consent, state.consent);
    }

    // Update user if provided
    if (state.user) {
      collector.user = assign(collector.user, state.user);
    }

    // Update globals if provided
    if (state.globals) {
      collector.globals = assign(
        collector.config.globalsStatic || {},
        state.globals,
      );
    }

    // Update custom if provided
    if (state.custom) {
      collector.custom = assign(collector.custom, state.custom);
    }
  }

  // Reset destination queues
  Object.values(collector.destinations).forEach((destination) => {
    destination.queue = [];
  });

  // Reset collector queue for this run
  collector.queue = [];

  // Increase round counter
  collector.round++;

  // Process any queued events now that the collector is allowed
  const result = await pushToDestinations(collector);

  // Call the predefined run events
  onApply(collector, 'run');

  return result;
}
