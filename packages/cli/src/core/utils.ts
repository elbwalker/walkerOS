export function formatDuration(startTime: number): string {
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

export function formatBytes(bytes: number): string {
  return (bytes / 1024).toFixed(2);
}

export function createJsonOutput(
  success: boolean,
  data?: any,
  error?: string,
  duration?: number,
) {
  return {
    success,
    ...(data && { ...data }),
    ...(error && { error }),
    ...(duration && { duration }),
  };
}
