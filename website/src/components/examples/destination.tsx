import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Destination, Mapping, WalkerOS } from '@elbwalker/types';
import { destinationPush } from '../mappings/destination'; // Adjust the import path as necessary
import { createEvent } from '@elbwalker/utils';
import EventMapping from '../preview/eventMapping';

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
      left={custom}
      fn={mappingFn}
      labelLeft="Custom Config"
      showMiddle={false}
      labelRight="Result"
      height={400}
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
      left={event}
      middle={mapping}
      fn={mappingFn}
      options={customConfig}
    />
  );
};
