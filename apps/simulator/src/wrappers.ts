import type { WalkerOS, Collector, Wrapper, Source } from '@walkeros/core';
import { createCollector, createSource } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationGtag } from '@walkeros/web-destination-gtag';
import { destinationAPI } from '@walkeros/web-destination-api';
import type {
  WrappedCollector,
  WrappedDestination,
  CaptureCallback,
  FlowCapture,
} from './types';

export interface PackageWrappers {
  wrapCollector: (
    config: Collector.Config,
    nodeId: string,
    captureCallback: CaptureCallback,
  ) => Promise<WrappedCollector>;

  wrapBrowserSource: (
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ) => Promise<unknown>;

  wrapGtagDestination: (
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ) => Promise<WrappedDestination>;

  wrapApiDestination: (
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ) => Promise<WrappedDestination>;
}

export function createPackageWrappers(): PackageWrappers {
  async function wrapCollector(
    config: Collector.Config,
    nodeId: string,
    captureCallback: CaptureCallback,
  ): Promise<WrappedCollector> {
    const wrapperConfig: Wrapper.Config = {
      dryRun: false,
      onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
        const capture: FlowCapture = {
          stage: 'collector_input',
          nodeId,
          data: args,
          functionName: context.name,
          args,
        };
        captureCallback(capture);
      },
    };

    const collectorConfig: Collector.Config = {
      ...config,
    };

    const { collector } = await createCollector(collectorConfig);

    const wrappedCollector = collector as WrappedCollector;
    wrappedCollector.__simulator_nodeId = nodeId;

    return wrappedCollector;
  }

  async function wrapBrowserSource(
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ): Promise<unknown> {
    const wrapperConfig: Wrapper.Config = {
      dryRun: false,
      onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
        const capture: FlowCapture = {
          stage: 'source_output',
          nodeId,
          data: args,
          functionName: context.name,
          args,
        };
        captureCallback(capture);
      },
    };

    const browserConfig = {
      type: 'browser' as const,
      settings: {
        prefix: 'data-elb',
        scope: (typeof document !== 'undefined'
          ? document
          : null) as unknown as Element,
        pageview: false,
        session: false,
        ...(config || {}),
      },
      wrapper: wrapperConfig,
    };

    // Create a temporary collector for the browser source
    const { collector } = await createCollector({ destinations: {} });
    const source = await createSource(collector, sourceBrowser, browserConfig);
    return source;
  }

  async function wrapGtagDestination(
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ): Promise<WrappedDestination> {
    const wrapperConfig: Wrapper.Config = {
      dryRun: true,
      onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
        const capture: FlowCapture = {
          stage: 'destination_output',
          nodeId,
          data: args,
          functionName: context.name,
          args,
        };
        captureCallback(capture);
      },
    };

    const destination = {
      ...destinationGtag,
      config: {
        ...destinationGtag.config,
        ...(config || {}),
        wrapper: wrapperConfig,
      },
      __simulator_nodeId: nodeId,
    } as unknown as WrappedDestination;

    return destination;
  }

  async function wrapApiDestination(
    config: Record<string, unknown>,
    nodeId: string,
    captureCallback: CaptureCallback,
  ): Promise<WrappedDestination> {
    const wrapperConfig: Wrapper.Config = {
      dryRun: true,
      onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
        const capture: FlowCapture = {
          stage: 'destination_output',
          nodeId,
          data: args,
          functionName: context.name,
          args,
        };
        captureCallback(capture);
      },
    };

    const destination = {
      ...destinationAPI,
      config: {
        ...destinationAPI.config,
        ...(config || {}),
        wrapper: wrapperConfig,
      },
      __simulator_nodeId: nodeId,
    } as unknown as WrappedDestination;

    return destination;
  }

  return {
    wrapCollector,
    wrapBrowserSource,
    wrapGtagDestination,
    wrapApiDestination,
  };
}
