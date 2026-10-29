import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'auth-methods': {
    text: 'BigQuery authenticates three ways. config.credentials: a service account key as a JSON string or object, backed by $secret, used by walkeros setup and by event writes. settings.bigquery: raw client options such as { keyFilename: "./sa.json" }, passed to both clients. Neither set: Application Default Credentials (the attached service account on GCP compute, GOOGLE_APPLICATION_CREDENTIALS elsewhere). A pre-built settings.client is used by walkeros setup only, never for event writes.',
    code: [
      {
        lang: 'json',
        code: '{ "settings": { "projectId": "my-project" }, "credentials": "$secret.BIGQUERY_SA_KEY" }',
      },
      {
        lang: 'json',
        code: '{ "settings": { "projectId": "my-project" } }',
      },
    ],
  },
  'storage-format': {
    text: 'All events go to one table, by default dataset "walkerOS" and table "events" (settings.datasetId, settings.tableId). Each event is one row of 15 columns: name, id, trigger, entity and action as strings, timestamp as a TIMESTAMP, timing as a number, and the object fields (data, context, globals, custom, user, nested, consent, source) as JSON. walkeros setup creates the dataset in config.setup.location (default EU) and the table, partitioned by day on timestamp.',
  },
  'query-json-columns': {
    text: 'The object fields (data, context, globals, user and the others) are JSON columns in the default table. Query them with BigQuery JSON functions such as JSON_EXTRACT_SCALAR; paths follow the walkerOS event structure.',
    code: [
      {
        lang: 'sql',
        code: "SELECT JSON_EXTRACT_SCALAR(data, '$.value') AS value FROM `project.walkerOS.events` WHERE entity = 'order'",
      },
    ],
  },
  'troubleshoot-empty-table': {
    text: 'Events not appearing? The collector logs the first failed write of each cause as an ERROR line and counts repeats within a minute in status.destinations.<id>.failed. Common causes: the dataset or table does not exist (set config.setup: true and run walkeros setup destination.<id> once; without config.setup the command skips), projectId names another project, or the service account lacks roles/bigquery.dataEditor. projectId is checked when the destination starts; the table is opened at the first event.',
  },
};
