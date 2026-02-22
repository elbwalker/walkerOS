import { randomUUID } from 'crypto';
import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { createCommandLogger } from '../../core/logger.js';
import { VERSION } from '../../version.js';

export interface HeartbeatOptions {
  deployment: string; // slug
  projectId?: string;
  url: string; // public URL of this server
  healthEndpoint?: string; // default: /health
  heartbeatInterval?: number; // seconds, default: 60
  mode: 'collect' | 'serve';
}

export async function startHeartbeat(options: HeartbeatOptions) {
  const projectId = options.projectId ?? requireProjectId();
  const base = resolveBaseUrl();
  const instanceId = randomUUID();
  const healthEndpoint = options.healthEndpoint ?? '/health';
  const intervalSec = options.heartbeatInterval ?? 60;
  const log = createCommandLogger({});
  const startTime = Date.now();

  const heartbeatUrl = `${base}/api/projects/${projectId}/deployments/${options.deployment}/heartbeat`;

  // 1. Initial heartbeat (acts as registration)
  const initResponse = await authenticatedFetch(heartbeatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: options.url,
      healthEndpoint,
      instanceId,
      cliVersion: VERSION,
      mode: options.mode,
    }),
  });

  if (!initResponse.ok) {
    const err = await initResponse.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
        `Initial heartbeat failed (${initResponse.status})`,
    );
  }

  const initData = (await initResponse.json()) as {
    ack: boolean;
    deploymentId: string;
    action: string;
  };
  log.success(
    `Registered as ${instanceId} on deployment ${options.deployment} (${initData.deploymentId})`,
  );

  // 2. Ongoing heartbeat loop
  const heartbeatTimer = setInterval(async () => {
    try {
      const resp = await authenticatedFetch(heartbeatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          uptime: Math.floor((Date.now() - startTime) / 1000),
          cliVersion: VERSION,
          metadata: {
            nodeVersion: process.version,
            platform: process.platform,
          },
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
          action: string;
          versionNumber?: number;
          bundleUrl?: string;
        };
        if (data.action === 'update' && data.bundleUrl) {
          log.info(
            `Update available: version ${data.versionNumber}, downloading from ${data.bundleUrl}`,
          );
          // TODO: Hot-reload bundle from bundleUrl
        } else if (data.action === 'stop') {
          log.info('Received stop signal from server, shutting down...');
          await cleanup();
          process.exit(0);
        }
      }
    } catch (err) {
      log.error(
        `Heartbeat failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }, intervalSec * 1000);

  // 3. Cleanup on shutdown
  const cleanup = async () => {
    clearInterval(heartbeatTimer);
    try {
      await authenticatedFetch(heartbeatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          uptime: Math.floor((Date.now() - startTime) / 1000),
          shutting_down: true,
        }),
      });
    } catch {
      // Best effort
    }
  };

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  return { instanceId, deploymentId: initData.deploymentId, cleanup };
}
