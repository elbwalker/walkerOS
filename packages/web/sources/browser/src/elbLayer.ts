import type { WalkerOS, Elb, Logger } from '@walkeros/core';
import type { ELBLayer, ELBLayerConfig, Settings } from './types';
import { tryCatch, isString, isObject } from '@walkeros/core';
import { translateToCoreCollector } from './translation';

/**
 * Initialize elbLayer for async command handling.
 *
 * Installs the live `push` override on `window.elbLayer` and drains any
 * walker commands (`walker *`) that were queued before initialization.
 * Non-walker events stay in the array — they are drained later from the
 * source's `on('run')` handler via `drainNonWalkerEvents`, anchored at
 * the last `walker run` entry.
 */
export function initElbLayer(
  elb: Elb.Fn,
  config: ELBLayerConfig & {
    prefix?: string;
    window?: Window;
    logger?: Logger.Instance;
  } = {},
): void {
  const layerName = config.name || 'elbLayer';
  const windowObj = config.window;
  const logger = config.logger;
  if (!windowObj) return;

  // Ensure elbLayer exists on window
  const windowWithLayer = windowObj as typeof windowObj &
    Record<string, unknown>;
  if (!windowWithLayer[layerName]) {
    windowWithLayer[layerName] = [];
  }

  const elbLayer = windowWithLayer[layerName] as ELBLayer;

  const scope = windowObj.document as Document;

  logger?.debug('initElbLayer enter', {
    layerName,
    queuedItems: elbLayer.length,
  });

  // Override the push method to process items immediately
  elbLayer.push = function (...args: Array<Elb.Layer | IArguments>) {
    // Handle arguments object
    if (isArguments(args[0])) {
      const argsArray = [...Array.from(args[0])];
      const i = Array.prototype.push.apply(this, [argsArray]);
      // Process the arguments as a single command
      pushCommand(elb, config.prefix, argsArray, scope, logger);
      return i;
    }

    const i = Array.prototype.push.apply(this, args);

    // Process each pushed item immediately
    args.forEach((item) => {
      pushCommand(elb, config.prefix, item, scope, logger);
    });

    return i;
  };

  // Drain walker commands from any pre-existing queue items.
  // Non-walker events stay in the array for `drainNonWalkerEvents`.
  if (Array.isArray(elbLayer) && elbLayer.length > 0) {
    logger?.debug('initElbLayer drain walker commands', {
      count: elbLayer.length,
    });
    drainWalkerCommands(
      elb,
      config.prefix ?? 'data-elb',
      elbLayer,
      scope,
      logger,
    );
  }
}

/**
 * Drain walker commands (`walker *`) from the elbLayer queue.
 *
 * Called from `initElbLayer` during source init. Iterates the queue in
 * declaration order, pushes each walker command via `pushCommand`, then
 * removes the consumed entries from the live array. Non-walker events
 * stay in place.
 */
function drainWalkerCommands(
  elb: Elb.Fn,
  prefix: string,
  elbLayer: ELBLayer,
  scope: Document,
  logger?: Logger.Instance,
): void {
  const walkerCommand = 'walker '; // Space on purpose
  // Iterate a snapshot — the array may be mutated by side effects of elb.
  const snapshot = [...elbLayer];
  const consumed = new Set<number>();
  snapshot.forEach((pushedItem, idx) => {
    const item = normalizeItem(pushedItem);
    if (!item) return;
    const firstParam = item[0];
    const isCommand =
      !isObject(firstParam) &&
      isString(firstParam) &&
      firstParam.startsWith(walkerCommand);
    if (!isCommand) return;
    consumed.add(idx);
    pushCommand(elb, prefix, item, scope, logger);
  });
  // Remove consumed commands from the live array, descending index order
  // so splice indices remain valid.
  const indices = [...consumed].sort((a, b) => b - a);
  for (const i of indices) elbLayer.splice(i, 1);
  logger?.debug('drainWalkerCommands done', {
    consumed: consumed.size,
    remaining: elbLayer.length,
  });
}

/**
 * Drain non-walker events from the elbLayer queue, anchored at the
 * LAST `walker run` entry.
 *
 * Items before that anchor are stale — a prior run already had its chance.
 * Items at strictly greater indices are current and replay through
 * `pushCommand`. If no `walker run` is in the queue, anchor is `-1` and
 * the entire queue replays.
 *
 * Called from the browser source's `on('run')` handler.
 */
export function drainNonWalkerEvents(
  elb: Elb.Fn,
  settings: Pick<Settings, 'prefix'> & {
    elbLayer?: Settings['elbLayer'];
  },
  windowObj: Window,
  logger?: Logger.Instance,
): void {
  const layerName = isString(settings.elbLayer)
    ? settings.elbLayer
    : 'elbLayer';
  const prefix = settings.prefix || 'data-elb';
  const layer = (windowObj as unknown as Record<string, unknown>)[layerName];
  if (!Array.isArray(layer)) return;
  const scope = windowObj.document as Document;

  let anchor = -1;
  layer.forEach((pushedItem, idx) => {
    const item = normalizeItem(pushedItem);
    if (!item) return;
    if (isString(item[0]) && item[0] === 'walker run') anchor = idx;
  });

  const drained: unknown[] = [];
  for (let i = anchor + 1; i < layer.length; i++) {
    const normalized = normalizeItem(layer[i]);
    if (normalized) drained.push(normalized);
  }
  // Remove drained tail from live array.
  layer.length = anchor + 1;
  logger?.debug('drainNonWalkerEvents', {
    anchor,
    drained: drained.length,
  });
  drained.forEach((item) => pushCommand(elb, prefix, item, scope, logger));
}

/**
 * Normalize a queue item into an Array (or null if invalid/empty).
 */
function normalizeItem(pushedItem: unknown): unknown[] | null {
  const item = isArguments(pushedItem)
    ? [...Array.from(pushedItem)]
    : isArrayLike(pushedItem)
      ? Array.from(pushedItem as ArrayLike<unknown>)
      : [pushedItem];
  if (!Array.isArray(item) || item.length === 0) return null;
  if (item.length === 1 && !item[0]) return null;
  const firstParam = item[0];
  if (isObject(firstParam) && Object.keys(firstParam as object).length === 0) {
    return null;
  }
  if (
    !isObject(firstParam) &&
    isString(firstParam) &&
    firstParam.trim() === ''
  ) {
    return null;
  }
  return item;
}

/**
 * Push command directly using elb or translation based on type
 */
function pushCommand(
  elb: Elb.Fn,
  prefix: string = 'data-elb',
  item: unknown,
  scope?: Document,
  logger?: Logger.Instance,
): void {
  tryCatch(
    () => {
      if (Array.isArray(item)) {
        const [action, ...rest] = item;

        // Skip empty or invalid actions
        if (!action || (isString(action) && action.trim() === '')) {
          logger?.debug('pushCommand skipped (empty/invalid action)', {
            item,
          });
          return;
        }

        // Walker commands go directly to collector
        if (isString(action) && action.startsWith('walker ')) {
          logger?.debug('pushCommand walker command', {
            action,
            data: rest[0],
          });
          elb(action, rest[0]);
          return;
        }

        logger?.debug('pushCommand event (translated)', {
          action,
          rest,
        });
        translateToCoreCollector(
          {
            elb,
            settings: {
              prefix,
              scope,
              pageview: false,
              elb: '',
              elbLayer: false,
            },
          },
          action,
          ...rest,
        );
      } else if (item && typeof item === 'object') {
        // Skip empty objects
        if (Object.keys(item).length === 0) {
          logger?.debug('pushCommand skipped (empty object)');
          return;
        }
        logger?.debug('pushCommand object event', { item });
        // Object events go directly to elb
        elb(item as WalkerOS.DeepPartialEvent);
      }
    },
    (error) => {
      logger?.warn('pushCommand failed', { error, item });
    },
  )();
}

/**
 * Check if value is arguments object
 */
function isArguments(value: unknown): value is IArguments {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Arguments]'
  );
}

/**
 * Check if value is array-like (has length property)
 */
function isArrayLike(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value as unknown[]).length === 'number'
  );
}
