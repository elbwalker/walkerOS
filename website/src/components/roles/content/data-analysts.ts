import type { RoleContent } from '../roles';

const content: RoleContent = {
  slug: 'data-analysts',
  meta: {
    title: 'walkerOS for data analysts',
    description:
      'How walkerOS gets consistently named, checked events into your own BigQuery table, so less of your SQL goes into repairing tracking.',
  },
  hero: {
    headline: 'Stop rebuilding the same event cleanup in SQL every month',
    lede: 'With walkerOS, the renaming and fixing you do in SQL today can happen in the collection config, before an event reaches GA4 or your warehouse. BigQuery is one of the destinations, and it gets one row per event in a table in your own project.',
    primary: {
      label: 'See what one event looks like',
      href: '/docs/getting-started/event-model/',
    },
    secondary: { label: 'See how mapping works', href: '/docs/mapping/' },
  },
  situations: {
    headline: 'The reports you keep having to defend',
    items: [
      {
        claim:
          "Your acquisition report has a growing 'Unassigned' bucket, and nobody can tell you which values put the traffic there.",
        witness:
          'When a session starts, the session source writes the UTM parameters and the referrer hostname it saw into the `session start` event. Once those events land in your own table, you can query which campaign values each session really arrived with. See the [session source](/docs/sources/web/session/).',
      },
      {
        claim:
          'Your backend and your analytics tool disagree about how many orders happened, and the gap moves every time you check.',
        witness:
          "Two causes of that gap can be handled in the pipeline. A contract can require an order id, and a validate step in `strict` mode drops an order event that arrives without one. A cache rule on a destination, keyed on the event name and order id, stops a repeat from being sent to that destination again within the rule's `ttl`. The default cache lives in memory, so a browser reload or a second server instance is only covered when the cache uses a store they share. See [cache](/docs/collector/cache/) and [validate](/docs/transformers/validate/).",
      },
      {
        claim:
          'Your channel report lists facebook, Facebook, FB, fb, and meta as separate sources, because every campaign manager writes UTMs their own way.',
        witness:
          'A `policy` on the source rewrites a field before the event reaches the collector, so a short function in the config can turn all of those spellings into one value. Every destination that reads the field then gets the same name. You write the list of spellings yourself, since there is no built-in lookup table. See [policy](/docs/mapping/value/#policy).',
      },
      {
        claim:
          "Your best pages past the row limit get folded into one '(other)' row, and low-traffic rows disappear under a threshold you can't change.",
        witness:
          'The BigQuery destination writes one row per event, and nothing in the pipeline aggregates rows or holds back small counts. The long tail is a query you write against your own table. See the [default table schema](/docs/destinations/server/gcp/#default-table-schema).',
      },
    ],
  },
  changes: [
    {
      kicker: 'Mapping',
      headline: 'One event, shaped separately for GA4 and for your table',
      body: "A product view is captured once as `product view`, with its properties under `data`. Each destination then has its own mapping rule. The rule shown here renames the event to GA4's `view_item` and picks the fields GA4 expects, while the BigQuery destination can take the whole event or a map of its own. When GA4 and your table disagree about a value, both rules are in the flow config for you to compare.",
      code: `{
  product: {
    view: {
      name: 'view_item',
      data: {
        map: {
          item_id: 'data.id',
          value: 'data.price',
          currency: { value: 'USD' },
        },
      },
    },
  },
}`,
      caption:
        'The GA4 rule for `product view`, as it appears in the [mapping docs](/docs/mapping/).',
    },
    {
      kicker: 'Warehouse',
      headline: 'Your events table, in your own BigQuery project',
      body: "BigQuery is a destination in a walkerOS server flow. Rows stream in through BigQuery's Storage Write API, and walkerOS sets no daily event limit of its own. A table created with the CLI's setup command is partitioned by day on `timestamp` and clustered on name, entity and action, so queries that filter on `timestamp` scan less. Event properties sit in a `data` JSON column you read with `JSON_VALUE`, with no `event_params` array to unnest, and a destination mapping can write your own column layout instead.",
      code: `"destinations": {
  "bigquery": {
    "package": "@walkeros/server-destination-gcp",
    "import": "destinationBigQuery",
    "config": {
      "settings": {
        "projectId": "YOUR_PROJECT_ID",
        "datasetId": "YOUR_DATASET_ID",
        "tableId": "YOUR_TABLE_ID"
      }
    }
  }
}`,
      caption:
        "The BigQuery destination as it goes into a server flow's `flow.json`.",
    },
    {
      kicker: 'Data quality',
      headline: 'Required fields checked before events reach your table',
      body: 'A contract lists, per event, which fields must be present and what type they are, written as JSON Schema in the flow config. A validate step checks events against it. In `strict` mode a failing event is dropped before any destination sees it. In `pass` mode it continues with a `true` or `false` verdict at `source.valid`, which the default BigQuery table keeps in its `source` column, so an order missing its `currency` becomes a row you can filter on.',
      code: `"transformers": {
  "validate": {
    "package": "@walkeros/transformer-validate",
    "config": { "settings": { "contract": ["$contract.web"], "mode": "strict" } },
    "next": "ga4"
  }
}`,
      caption:
        "A validate step that points at a named contract and drops events that don't match it.",
    },
  ],
  fit: {
    headline: 'What keeps running, and what changes',
    stays: [
      'GTM and GA4 can stay as they are at the start. The [dataLayer source](/docs/sources/web/dataLayer/) reads the `dataLayer.push()` calls your site already makes and still passes each one on to GTM.',
      'The GA4 BigQuery export can keep running next to the new table while you compare the two.',
      'Your dbt project and BI tool stay on BigQuery, with the walkerOS table as one more source for them.',
    ],
    changes: [
      'Events share one structure: a name made of entity and action, like `order complete`, properties under `data`, and user, consent and context in fields of their own.',
      'A contract lists the fields your reports depend on, and a validate step can drop or flag events that miss them.',
      'BigQuery gets its rows straight from the pipeline, one per event, in a table whose schema your team controls.',
      'Each event carries the consent state it was collected under, stored in its own `consent` column in the default table.',
    ],
    firstStep:
      "You probably don't own the site's tracking, so the first step is a request. Ask your developers or tracking team for a walkerOS server flow that writes to a test BigQuery dataset, fed by the dataLayer your site already has, so it runs beside GTM and you can query it next to your GA4 export.",
  },
  limits: [
    'Someone has to build and run it. BigQuery is a server destination, so events need a server flow running in your cloud plus a change on the site that sends events there, and for most analysts that is work for a developer or the tracking team.',
    'The walkerOS table has its own schema, so queries and dbt models written for the GA4 export need a new staging layer. There is no ready-made dbt package.',
    'Most fields in the default schema (`data`, `context`, `globals` and more) are JSON columns. Flat columns per property take a destination mapping plus a matching table schema, which you set up yourself.',
    "It won't make GA4 and your backend report the same totals. Ad blockers and declined consent still remove events, each tool still processes data its own way, and cache-based deduplication only spans one running instance unless it is backed by a shared store.",
    'A contract and a validate step only act on events passing through the pipeline from now on. Data that GA4 or GTM already collected stays as it is.',
  ],
  questions: [
    {
      question: 'Do I have to give up GA4?',
      answer:
        'No. You can start with walkerOS reading the same dataLayer GTM uses, while GTM keeps sending to GA4 as before. If your team later moves GA4 onto walkerOS, it becomes one more [destination](/docs/destinations/web/gtag/ga4/) with its own mapping. The [dataLayer source](/docs/sources/web/dataLayer/) docs describe running walkerOS alongside an existing dataLayer.',
    },
    {
      question: "I don't own the tracking. What do I ask for?",
      answer:
        'Ask for a server flow with the BigQuery destination writing to a dataset you can query, and a contract that marks the fields your reports rely on as required. Ask for read access to the flow config as well: it is a single JSON file, so you can read the mapping behind any column. The [BigQuery destination](/docs/destinations/server/gcp/) page lists the Google Cloud permissions your team will need.',
    },
    {
      question: 'Will this fix the numbers already in my GA4 property?',
      answer:
        'No. The validate step only checks events as they pass through the pipeline, so data GA4 already holds stays as it is. The [validate docs](/docs/transformers/validate/) show what it reads: the live event, at the point in the flow where you place the step.',
    },
  ],
  next: {
    headline: 'Where to look next',
    links: [
      {
        label: 'Google BigQuery destination',
        href: '/docs/destinations/server/gcp/',
        note: 'The default table schema and what your team needs to set it up.',
      },
      {
        label: 'Contract',
        href: '/docs/getting-started/flow/contract/',
        note: 'How required fields and their types are written down per event.',
      },
      {
        label: 'Validate',
        href: '/docs/transformers/validate/',
        note: 'What happens to an event that fails its contract.',
      },
    ],
  },
};

export default content;
