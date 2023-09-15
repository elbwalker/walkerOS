import { TableMetadata } from '@google-cloud/bigquery';

export const schema: TableMetadata = {
  location: 'EU',
  timePartitioning: {
    type: 'DAY',
    expirationMs: '7776000000',
    field: 'timestamp',
  },
  schema: [
    {
      name: 'event',
      type: 'STRING',
      mode: 'REQUIRED',
      description: 'Combination of entity and action',
    },
    {
      name: 'data',
      type: 'JSON',
      description:
        'Arbitrary set properties with the data-elb-promotion attribute',
    },
    {
      name: 'context',
      type: 'JSON',
      description:
        'Related properties defined with the data-elbcontext attribute',
    },
    {
      name: 'custom',
      type: 'JSON',
      description: 'Additional custom data',
    },
    {
      name: 'globals',
      type: 'JSON',
      description:
        'General Properties defined with the data-elbglobals attribute',
    },
    {
      name: 'user',
      type: 'RECORD',
      description: 'Stored user ids (manually added once)',
      fields: [
        {
          name: 'id',
          type: 'STRING',
          description: 'Unique id of a single user',
        },
        {
          name: 'device',
          type: 'STRING',
          description: 'Device identifier',
        },
        {
          name: 'session',
          type: 'STRING',
          description: 'Temporary session identifier',
        },
      ],
    },
    {
      name: 'nested',
      type: 'JSON',
      description: 'All nested entities within the entity',
    },
    {
      name: 'consent',
      type: 'JSON',
      mode: 'REQUIRED',
      description: 'Status of the consent state(s)',
    },
    {
      name: 'id',
      type: 'STRING',
      mode: 'REQUIRED',
      description: 'Timestamp, group & count of the event',
    },
    {
      name: 'trigger',
      type: 'STRING',
      description: 'Name of the trigger that fired',
    },
    {
      name: 'entity',
      type: 'STRING',
      mode: 'REQUIRED',
      description: 'Entity name',
    },
    {
      name: 'action',
      type: 'STRING',
      mode: 'REQUIRED',
      description: 'Entities action',
    },
    {
      name: 'timestamp',
      type: 'TIMESTAMP',
      mode: 'REQUIRED',
      description: 'Time when the event fired',
    },
    {
      name: 'timing',
      type: 'NUMERIC',
      description: 'How long it took from the page load to trigger the event',
    },
    {
      name: 'group',
      type: 'STRING',
      description: 'Random group id for all events on a page',
    },
    {
      name: 'count',
      type: 'NUMERIC',
      description: 'Incremental counter of the events on a page',
    },
    {
      name: 'version',
      type: 'RECORD',
      description: 'Helpful when working with raw data',
      fields: [
        {
          name: 'client',
          type: 'STRING',
          description: 'Version of the client configuration',
        },
        {
          name: 'server',
          type: 'STRING',
          description: 'Version of the server configuration',
        },
      ],
    },
    {
      name: 'source',
      type: 'RECORD',
      description: 'Origins of the event',
      fields: [
        {
          name: 'type',
          type: 'STRING',
          description: 'Source type of the event',
        },
        {
          name: 'id',
          type: 'STRING',
          description: "Source id of the event's origin (url)",
        },
        {
          name: 'previous_id',
          type: 'STRING',
          description: 'Previous source id (referrer)',
        },
      ],
    },
    {
      name: 'server_timestamp',
      type: 'TIMESTAMP',
      mode: 'REQUIRED',
      description: 'Timestamp when the sGTM processed the event in ms',
    },
  ],
};
