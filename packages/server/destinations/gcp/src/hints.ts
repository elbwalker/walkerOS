import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'auth-methods': {
    text: 'Supports three auth methods: SA key file via bigquery options ({ bigquery: { keyFilename: "./sa.json" } }), Application Default Credentials (automatic on GCP infrastructure — just provide projectId), or a pre-configured BigQuery client instance (client option). See settings schema for all options.',
    code: [
      {
        lang: 'json',
        code: '{ "settings": { "projectId": "my-project", "bigquery": { "keyFilename": "./sa.json" } } }',
      },
      {
        lang: 'json',
        code: '{ "settings": { "projectId": "my-project" } }',
      },
    ],
  },
  'storage-format': {
    text: 'All events are stored in a single table. Scalar fields (strings, numbers, booleans) are stored as-is. Nested objects and arrays are JSON-stringified automatically. Defaults: dataset "walkeros", table "events", location "EU" — all overridable via settings.',
  },
  'query-json-columns': {
    text: 'Nested event fields (data, context, globals, user) are stored as JSON strings. Use BigQuery JSON_EXTRACT_SCALAR to query them. Field paths follow the walkerOS event structure.',
    code: [
      {
        lang: 'sql',
        code: "SELECT JSON_EXTRACT_SCALAR(data, '$.total') AS total FROM `project.walkeros.events` WHERE entity = 'order'",
      },
    ],
  },
  'troubleshoot-empty-table': {
    text: "Events not appearing? Common causes: projectId doesn't match GCP project, dataset doesn't exist yet (create via BigQuery console or bq CLI before first push), or SA key lacks bigquery.dataEditor role. The destination validates client/datasetId/tableId at push time but GCP permission errors surface from the BigQuery SDK.",
  },
};
