import type { WalkerOS, Wrapper } from '@walkeros/core';
import type { CaptureCallback, FlowCapture, SimulationError } from './types';

export function createInterceptor(
  simulationId: string,
  captureCallback: CaptureCallback,
): {
  createWrapperConfig: (
    nodeId: string,
    stage: FlowCapture['stage'],
  ) => Wrapper.Config;
} {
  function createWrapperConfig(
    nodeId: string,
    stage: FlowCapture['stage'],
  ): Wrapper.Config {
    return {
      dryRun: true,
      onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
        const capture: FlowCapture = {
          stage,
          nodeId,
          data: args,
          functionName: context.name,
          args,
        };
        captureCallback(capture);
      },
    };
  }

  return {
    createWrapperConfig,
  };
}

export function createCaptureHandler(
  simulationId: string,
  captures: FlowCapture[],
  errors: SimulationError[],
): CaptureCallback {
  return (capture: FlowCapture) => {
    captures.push(capture);
  };
}
