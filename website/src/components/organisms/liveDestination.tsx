import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';
import type { LiveCodeProps } from './liveCode';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { createEvent, destinationPush, tryCatchAsync } from '@walkerOS/utils';
import { LiveCode } from './liveCode';
import { formatValue, parseInput } from '../molecules/codeBox';

interface DestinationContextValue {
  customConfig: WalkerOS.AnyObject;
  setConfig: (config: WalkerOS.AnyObject) => void;
  destination: DestinationWeb.Destination;
  fnName: string;
}

const DestinationContext = createContext<DestinationContextValue | undefined>(
  undefined,
);

interface DestinationContextProviderProps {
  children: React.ReactNode;
  destination: DestinationWeb.Destination;
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
  const input = formatValue(custom);

  const mappingFn = async (
    input: never,
    middle: never,
    log: (...args: unknown[]) => void,
  ) => {
    tryCatchAsync(
      async () => {
        const inputValue = await parseInput(input);
        setConfig(inputValue as WalkerOS.AnyObject);

        destination.init(
          {
            custom: inputValue,
            fn: log,
          },
          {} as never,
        );
      },
      (error) => {
        log(`Error mappingFn: ${error}`);
      },
    )();
  };

  return (
    <LiveCode
      fnName={fnName}
      input={input}
      fn={mappingFn}
      labelInput="Custom Config"
      labelOutput="Result"
    />
  );
};

interface DestinationPushProps
  extends Omit<LiveCodeProps, 'input' | 'config' | 'fn' | 'options'> {
  event: WalkerOS.PartialEvent;
  mapping?: Mapping.EventConfig | string;
  eventConfig?: boolean;
}

export const DestinationPush: React.FC<DestinationPushProps> = ({
  event,
  mapping = {},
  eventConfig = true,
  ...liveCodeProps
}) => {
  const { customConfig, destination, fnName } = useDestinationContext();
  const inputValue = formatValue(event);
  const mappingValue = formatValue(mapping);

  const mappingFn = useCallback(
    async (
      input: unknown,
      config: unknown,
      log: (...args: unknown[]) => void,
      options: WalkerOS.AnyObject,
    ) => {
      try {
        const inputValue = await parseInput(input);
        const configValue = await parseInput(config);
        const event = createEvent(inputValue);
        const [entity, action] = event.event.split(' ');
        const finalMapping = eventConfig
          ? { [entity]: { [action]: configValue } }
          : configValue;

        destinationPush(
          { hooks: {}, consent: event.consent } as never, // Fake instance
          {
            ...destination,
            config: {
              custom: options,
              fn: log,
              mapping: finalMapping as Mapping.Config,
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
    <LiveCode
      fnName={fnName}
      input={inputValue}
      config={mappingValue}
      fn={mappingFn}
      options={customConfig}
      {...liveCodeProps}
    />
  );
};
