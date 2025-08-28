import type { WalkerOS, Collector, Destination, Wrapper } from '@walkeros/core';

// Flow configuration types (simplified version of what Flow app provides)
export interface FlowNode {
  readonly id: string;
  readonly type: 'source' | 'collector' | 'destination';
  readonly sourceType?: string; // 'browser', 'dataLayer', etc.
  readonly destinationType?: string; // 'gtag', 'api', etc.
  readonly config?: Record<string, unknown>;
}

export interface FlowEdge {
  readonly source: string;
  readonly target: string;
}

export interface FlowConfiguration {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

// Simulation capture types
export interface FlowCapture {
  readonly stage:
    | 'source_output'
    | 'collector_input'
    | 'collector_output'
    | 'destination_input'
    | 'destination_output';
  readonly nodeId: string;
  readonly data: unknown;
  readonly functionName?: string; // For destination_output captures
  readonly args?: readonly unknown[]; // For destination_output captures
}

export interface SimulationTrace {
  readonly simulationId: string;
  readonly inputEvent: WalkerOS.Event;
  readonly captures: readonly FlowCapture[];
  readonly errors: readonly SimulationError[];
}

export interface SimulationError {
  readonly stage: string;
  readonly nodeId: string;
  readonly error: Error;
}

export interface SimulationResult {
  readonly traces: readonly SimulationTrace[];
  readonly summary: SimulationSummary;
}

export interface SimulationSummary {
  readonly totalEvents: number;
  readonly successfulEvents: number;
  readonly failedEvents: number;
  readonly nodesProcessed: readonly string[];
}

export interface SimulationOptions {
  readonly simulationId?: string;
  readonly captureExternalCalls?: boolean;
}

// Wrapper callback types for capturing function calls
export interface CaptureCallback {
  (capture: FlowCapture): void;
}

// Package instance types after wrapping
export interface WrappedCollector extends Collector.Instance {
  __simulator_nodeId: string;
}

export interface WrappedDestination extends Destination.Instance {
  __simulator_nodeId: string;
}

// Internal simulation context
export interface SimulationContext {
  readonly simulationId: string;
  readonly captureCallback: CaptureCallback;
  readonly collector: WrappedCollector;
  readonly destinations: readonly WrappedDestination[];
  readonly errors: SimulationError[];
}
