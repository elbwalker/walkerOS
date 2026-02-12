/**
 * Register runtime with the app API
 *
 * Called at cold start to announce the instance and get a fresh
 * presigned bundle download URL.
 */

export interface RegisterConfig {
  appUrl: string;
  deployToken: string;
  projectId: string;
  flowId: string;
  bundlePath: string;
}

export interface RegisterResult {
  bundleUrl: string;
}

export async function registerRuntime(
  config: RegisterConfig,
): Promise<RegisterResult> {
  const url = `${config.appUrl}/api/projects/${config.projectId}/runtimes/register`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.deployToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      flowId: config.flowId,
      bundlePath: config.bundlePath,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Registration failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return { bundleUrl: data.bundleUrl };
}
