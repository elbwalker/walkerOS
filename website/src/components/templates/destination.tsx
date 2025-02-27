import type { Destination, Mapping, WalkerOS } from '@elbwalker/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createEvent, isString } from '@elbwalker/utils';
import MappingConfig from '../organisms/mapping';
import { formatValue, parseInput } from '../molecules/codeBox';
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
> = ({ children, destination, initialConfig = {}, fnName }) => {
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
  custom?: unknown;
}

export const DestinationInit: React.FC<DestinationInitProps> = ({
  custom = {},
}) => {
  const { destination, setConfig, fnName } = useDestinationContext();
  const left = formatValue(custom);

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
    <MappingConfig
      fnName={fnName}
      left={left}
      fn={mappingFn}
      labelLeft="Custom Config"
      showMiddle={false}
      labelRight="Result"
    />
  );
};

interface DestinationPushProps {
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.EventConfig | string;
  children?: React.ReactNode;
}

export const DestinationPush: React.FC<DestinationPushProps> = ({
  event,
  mapping = {},
  children,
}) => {
  const { customConfig, destination, fnName } = useDestinationContext();
  const middleValue = children ?? mapping;

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
        const finalMapping = {
          [entity]: { [action]: middle },
        };

        destinationPush(
          { hooks: {}, consent: event.consent } as never, // Fake instance
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
    <MappingConfig
      fnName={fnName}
      left={formatValue(event)}
      middle={formatValue(middleValue)}
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
import { EventMapping } from '@elbwalker/types/src/mapping';

function resolveMappingData(
  event: WalkerOS.Event,
  data?: Mapping.Data,
  options?: Mapping.Options,
): Destination.Data {
  if (!data) return;

  // @TODO update
  return Array.isArray(data)
    ? data.map((item) => getMappingValue(event, item, options))
    : getMappingValue(event, data, options);
}

export function destinationPush(
  instance: WalkerOS.Instance,
  destination: Destination.Destination,
  event: WalkerOS.Event,
): boolean {
  const { config } = destination;
  const { eventMapping, mappingKey } = getMappingEvent(event, config.mapping);

  let data = resolveMappingData(event, config.data, { instance });

  if (eventMapping) {
    // Check if event should be processed or ignored
    if (eventMapping.ignore) return false;

    // Check to use specific event names
    if (eventMapping.name) event.event = eventMapping.name;

    // Transform event to a custom data
    if (eventMapping.data) {
      const dataEvent = resolveMappingData(event, eventMapping.data, {
        instance,
      });
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
