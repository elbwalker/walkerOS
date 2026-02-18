export interface RunnerEnv {
  mode: 'collect' | 'serve';
  port: number;
  bundlePath: string;
  cacheDir: string;
  pollInterval: number;
  heartbeatInterval: number;
  apiEnabled: boolean;
  remoteConfig: boolean;
  token?: string;
  projectId?: string;
  flowId?: string;
}

export function validateEnv(
  env: Record<string, string | undefined>,
): RunnerEnv {
  const token = env.WALKEROS_TOKEN;
  const projectId = env.PROJECT_ID;
  const flowId = env.FLOW_ID;

  if (flowId && (!token || !projectId)) {
    throw new Error('FLOW_ID requires WALKEROS_TOKEN and PROJECT_ID');
  }
  if (token && !projectId) {
    throw new Error('WALKEROS_TOKEN requires PROJECT_ID');
  }

  return {
    mode: (env.MODE === 'serve' ? 'serve' : 'collect') as 'collect' | 'serve',
    port: parseInt(env.PORT || '8080', 10),
    bundlePath: env.BUNDLE || '/app/flow/bundle.mjs',
    cacheDir: env.CACHE_DIR || '/app/cache',
    pollInterval: parseInt(env.POLL_INTERVAL || '30', 10),
    heartbeatInterval: parseInt(env.HEARTBEAT_INTERVAL || '60', 10),
    apiEnabled: !!(token && projectId),
    remoteConfig: !!(token && projectId && flowId),
    token,
    projectId,
    flowId,
  };
}
