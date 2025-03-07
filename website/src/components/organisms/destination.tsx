import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Destination, Mapping, WalkerOS } from '@elbwalker/types';
import { createEvent } from '@elbwalker/utils';
import EventMapping from '../organisms/mapping';

interface DestinationContextValue {
  customConfig: WalkerOS.AnyObject;
  setConfig: (config: WalkerOS.AnyObject) => void;
  destination: Destination.Destination;
  fnName: string;
}

const DestinationContext = createContext<DestinationContextValue | undefined>(
  undefined,
);

interface DestinationContextProviderProps {
  children: React.ReactNode;
  destination: Destination.Destination;
  initialConfig?: WalkerOS.AnyObject;
  fnName?: string;
}

export const DestinationContextProvider: React.FC<
  DestinationContextProviderProps
> = ({ children, destination, initialConfig = {}, fnName = 'push' }) => {
  const [customConfig, setConfig] = useState<WalkerOS.AnyObject>(initialConfig);

  const value = useMemo(() => {
    return { customConfig, setConfig, destination, fnName };
  }, [customConfig, destination, fnName]);

  return (
    <DestinationContext.Provider value={value}>
      {children}
    </DestinationContext.Provider>
  );
};

export function useDestinationContext(): DestinationContextValue {
  const context = useContext(DestinationContext);
  if (!context)
    throw new Error(
      'useDestinationContext must be used within a DestinationContextProvider',
    );

  return context;
}

interface DestinationInitProps {
  custom?: WalkerOS.AnyObject;
}

export const DestinationInit: React.FC<DestinationInitProps> = ({
  custom = {},
}) => {
  const { destination, setConfig, fnName } = useDestinationContext();

  const mappingFn = (
    left: never,
    middle: never,
    log: (...args: unknown[]) => void,
  ) => {
    setConfig(left);
    try {
      // @TODO this is ugly af
      (
        (destination as unknown as WalkerOS.AnyObject)
          .init as WalkerOS.AnyFunction
      )(
        {
          custom: left,
          fn: log,
        },
        {},
      );
    } catch (error) {
      log(`Error mappingFn: ${error}`);
    }
  };

  return (
    <EventMapping
      fnName={fnName}
      input={custom}
      fn={mappingFn}
      labelInput="Custom Config"
      showMiddle={false}
      labelOutput="Result"
    />
  );
};

interface DestinationPushProps {
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.Config;
}

export const DestinationPush: React.FC<DestinationPushProps> = ({
  event,
  mapping = {},
}) => {
  const { customConfig, destination, fnName } = useDestinationContext();

  const mappingFn = useCallback(
    (
      left: unknown,
      middle: unknown,
      log: (...args: unknown[]) => void,
      options: WalkerOS.AnyObject,
    ) => {
      try {
        const event = createEvent(left);
        const [entity, action] = event.event.split(' ');
        const finalMapping = { [entity]: { [action]: middle } };

        destinationPush(
          { hooks: {} } as never, // Fake instance
          {
            ...destination,
            config: {
              custom: options,
              fn: log,
              mapping: finalMapping,
            },
          },
          event,
        );
      } catch (error) {
        log(`Error mappingFn: ${error}`);
      }
    },
    [],
  );

  return (
    <EventMapping
      fnName={fnName}
      input={event}
      config={mapping}
      fn={mappingFn}
      options={customConfig}
    />
  );
};

// Should be moved to utils
import {
  assign,
  debounce,
  getMappingEvent,
  getMappingValue,
  isDefined,
  isObject,
  tryCatch,
  useHooks,
} from '@elbwalker/utils';

function resolveMappingData(
  event: WalkerOS.Event,
  data?: Mapping.Data,
): Destination.Data {
  if (!data) return;

  // @TODO update
  return Array.isArray(data)
    ? data.map((item) => getMappingValue(event, item))
    : getMappingValue(event, data);
}

export function destinationPush(
  instance: WalkerOS.Instance,
  destination: Destination.Destination,
  event: WalkerOS.Event,
): boolean {
  const { config } = destination;
  const { eventMapping, mappingKey } = getMappingEvent(event, config.mapping);

  let data = resolveMappingData(event, config.data);

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      const dataEvent = resolveMappingData(event, eventMapping.data);
      data =
        isObject(data) && isObject(dataEvent) // Only merge objects
          ? assign(data, dataEvent)
          : dataEvent;
    }
  }

  const options = { data, instance };

  return !!tryCatch(() => {
    if (eventMapping?.batch && destination.pushBatch) {
      const batched = eventMapping.batched || {
        key: mappingKey || '',
        events: [],
        data: [],
      };
      batched.events.push(event);
      if (isDefined(data)) batched.data.push(data);

      eventMapping.batchFn =
        eventMapping.batchFn ||
        debounce((destination, instance) => {
          useHooks(
            destination.pushBatch!,
            'DestinationPushBatch',
            instance.hooks,
          )(batched, destination.config, options);

          // Reset the batched queues
          batched.events = [];
          batched.data = [];
        }, eventMapping.batch);

      eventMapping.batched = batched;
      eventMapping.batchFn(destination, instance);
    } else {
      // It's time to go to the destination's side now
      useHooks(
        // @TODO this is ugly af
        (destination as unknown as WalkerOS.AnyObject)
          .push as WalkerOS.AnyFunction,
        'DestinationPush',
        instance.hooks,
      )(event, destination.config, eventMapping, options);
    }

    return true;
  })();
}
