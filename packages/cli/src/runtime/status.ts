/**
 * Runner status tracking module
 *
 * Maintains runner state for health/status endpoints.
 * Used by serve mode directly and available for collect mode via the API.
 */

import { VERSION } from '../version.js';
import { getInstanceId } from './heartbeat.js';

export interface RunnerStatus {
  status: 'starting' | 'running' | 'degraded';
  version: string;
  mode: 'collect' | 'serve';
  instanceId: string;
  configVersion?: string;
  configSource: 'local' | 'api' | 'cache';
  apiEnabled: boolean;
  lastPoll?: string;
  lastHeartbeat?: string;
  uptime: number;
  port: number;
}

export interface StatusState {
  mode: 'collect' | 'serve';
  port: number;
  configSource: 'local' | 'api' | 'cache';
  configVersion?: string;
  apiEnabled: boolean;
}

let state: StatusState | null = null;
let startTime: number = Date.now();
let currentStatus: 'starting' | 'running' | 'degraded' = 'starting';
let lastPollTime: string | undefined;
let lastHeartbeatTime: string | undefined;

export function initStatus(initial: StatusState): void {
  state = initial;
  startTime = Date.now();
  currentStatus = 'starting';
}

export function setRunning(): void {
  currentStatus = 'running';
}

export function setDegraded(): void {
  currentStatus = 'degraded';
}

export function updateLastPoll(): void {
  lastPollTime = new Date().toISOString();
}

export function updateLastHeartbeat(): void {
  lastHeartbeatTime = new Date().toISOString();
}

export function updateConfigVersion(version: string): void {
  if (state) state.configVersion = version;
}

export function getStatus(): RunnerStatus {
  return {
    status: currentStatus,
    version: VERSION,
    mode: state?.mode ?? 'collect',
    instanceId: getInstanceId(),
    configVersion: state?.configVersion,
    configSource: state?.configSource ?? 'local',
    apiEnabled: state?.apiEnabled ?? false,
    lastPoll: lastPollTime,
    lastHeartbeat: lastHeartbeatTime,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    port: state?.port ?? 8080,
  };
}
