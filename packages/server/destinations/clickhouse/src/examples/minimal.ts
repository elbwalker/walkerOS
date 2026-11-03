import type { Flow } from '@walkeros/core';

/**
 * The setting ClickHouse needs to deliver: the HTTP endpoint URL.
 */
export const minimal: Flow.MinimalExample = {
  settings: { url: 'https://clickhouse.example.com:8443' },
};
