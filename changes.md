# Packages

The package structure has been significantly refactored with the following key changes:

1.  **New NPM Scope:** All packages have been moved from the `@elbwalker` scope to the new `@walkerOS` scope.
2.  **Introduction of Collectors:** The concept of "Sources" (`@elbwalker/source-node` and `@elbwalker/source-walkerjs`) has been renamed to "Collectors". The new packages are `@walkerOS/server-collector` and `@walkerOS/web-collector`, clarifying their role in event gathering.
3.  **Categorization of Destinations:** Destinations are now explicitly categorized by environment, moving from a flat structure (e.g., `@elbwalker/destination-web-google-ads`, `@elbwalker/destination-node-aws`) to a more organized one under `web` and `server` scopes (e.g., `@walkerOS/web-destination-google-ads`, `@walkerOS/server-destination-aws`).
4.  **Removed Packages:** The `@elbwalker/tagger` and `@elbwalker/source-gcp` packages from the old structure do not have a direct equivalent in the new structure and appear to have been removed or absorbed into other packages.


## OLD PACKAGE STRUCTURE

| Package Name | Exports | Description |
| :--- | :--- | :--- |
| **DESTINATIONS** | | |
| `@elbwalker/destination-node-aws` | `DestinationFirehose` (namespace), `destinationFirehose` (default) | AWS node destination, currently supporting Kinesis Firehose. |
| `@elbwalker/destination-node-bigquery`| `DestinationBigQuery` (namespace), `destinationBigQuery` (default) | Google BigQuery node destination. |
| `@elbwalker/destination-node-meta` | `DestinationMeta` (namespace), `destinationMeta` (default) | Meta (Facebook) Conversion API (CAPI) node destination. |
| `@elbwalker/destination-web-api` | `DestinationWebAPI` (namespace), `destinationWebAPI` (default) | Generic API web destination to send events to any endpoint. |
| `@elbwalker/destination-web-google-ads`| `DestinationGoogleAds` (namespace), `destinationGoogleAds` (default) | Google Ads web destination for conversion tracking. |
| `@elbwalker/destination-web-google-ga4`| `DestinationGoogleGA4` (namespace), `destinationGoogleGA4` (default) | Google Analytics 4 (GA4) web destination. |
| `@elbwalker/destination-web-google-gtm`| `DestinationGoogleGTM` (namespace), `destinationGoogleGTM` (default) | Google Tag Manager (GTM) web destination. |
| `@elbwalker/destination-web-meta-pixel`| `DestinationMetaPixel` (namespace), `destinationMetaPixel` (default) | Meta (Facebook) Pixel web destination. |
| `@elbwalker/destination-web-piwikpro`| `DestinationPiwikPro` (namespace), `destinationPiwikPro` (default) | Piwik PRO web destination. |
| `@elbwalker/destination-web-plausible`| `DestinationPlausible` (namespace), `destinationPlausible` (default) | Plausible Analytics web destination. |
| **SOURCES** | | |
| `@elbwalker/source-datalayer` | `SourceDataLayer` (namespace), `sourceDataLayer` (default) | Processes `dataLayer` events and pushes them to walker.js. |
| `@elbwalker/source-gcp` | `ConnectorGCP` (namespace), `sourceGCPHttpFunction` | GCP source to process HTTP requests. |
| `@elbwalker/source-node` | `DestinationNode`, `Elb`, `SourceNode` (namespaces), `createSourceNode`, `sourceNode` | The walker.js core for Node.js environments. |
| `@elbwalker/source-walkerjs` | `DestinationWeb`, `Elb`, `SourceWalkerjs`, `Walker` (namespaces), `elb`, `createSourceWalkerjs`, `Walkerjs` | The walker.js core for browser environments. |
| **UTILS** | | |
| `@elbwalker/tagger` | `default` (Tagger), `ITagger` (namespace) | A helper utility to create walker.js attributes. |
| `@elbwalker/types` | `Data`, `Destination`, `Elb`, `Handler`, `Hooks`, `Mapping`, `On`, `Request`, `Schema`, `WalkerOS` (namespaces) | Shared TypeScript types for the walkerOS ecosystem. |
| `@elbwalker/utils` | Numerous helper functions for validation, data manipulation, and web/node-specific tasks. | Shared utility functions for walkerOS packages. |


## NEW PACKAGE STRUCTURE

| Package Name | Exports | Description |
| :--- | :--- | :--- |
| **SERVER** | | |
| `@walkerOS/server-collector` | `ServerCollector` (namespace), `createServerCollector`, `serverCollector` (default) | The walker.js core for Node.js environments. |
| `@walkerOS/server-destination-aws` | `DestinationFirehose` (namespace), `destinationFirehose` | AWS server destination, currently supporting Kinesis Firehose. |
| `@walkerOS/server-destination-gcp` | `DestinationBigQuery` (namespace), `destinationBigQuery` | Google BigQuery server destination. |
| `@walkerOS/server-destination-meta` | `DestinationMeta` (namespace), `destinationMeta` | Meta (Facebook) Conversion API (CAPI) server destination. |
| **WEB** | | |
| `@walkerOS/web-collector` | `DestinationWeb`, `Elb`, `WebCollector`, `Walker` (namespaces), `elb`, `createWebCollector`, `webCollector` (default) | The walker.js core for browser environments. |
| `@walkerOS/web-destination-api` | `DestinationAPI` (namespace), `destinationAPI` (default) | Generic API web destination to send events to any endpoint. |
| `@walkerOS/web-destination-ga4` | `DestinationGA4` (namespace), `destinationGA4` (default) | Google Analytics 4 (GA4) web destination. |
| `@walkerOS/web-destination-google_ads` | `DestinationAds` (namespace), `destinationAds` (default) | Google Ads web destination for conversion tracking. |
| `@walkerOS/web-destination-gtm` | `DestinationGTM` (namespace), `destinationGTM` (default) | Google Tag Manager (GTM) web destination. |
| `@walkerOS/web-destination-meta` | `DestinationMetaPixel` (namespace), `destinationMetaPixel` (default) | Meta (Facebook) Pixel web destination. |
| `@walkerOS/web-destination-piwikpro` | `DestinationPiwikPro` (namespace), `destinationPiwikPro` (default) | Piwik PRO web destination. |
| `@walkerOS/web-destination-plausible` | `DestinationPlausible` (namespace), `destinationPausible` (default) | Plausible Analytics web destination. |
| `@walkerOS/web-source-dataLayer` | `SourceDataLayer` (namespace), `sourceDataLayer` (default) | Processes `dataLayer` events and pushes them to the web collector. |
| **UTILS** | | |
| `@walkerOS/types` | `Data`, `Destination`, `Elb`, `Handler`, `Hooks`, `Mapping`, `On`, `Request`, `Schema`, `WalkerOS` (namespaces) | Shared TypeScript types for the walkerOS ecosystem. |
| `@walkerOS/utils` | Numerous helper functions for validation, data manipulation, and web/node-specific tasks. | Shared utility functions for walkerOS packages. |

# docs

## OLD DOCS STRUCTURE (main)
    1 /website/docs/
    2 ├───getting_started/ (Getting Started)
    3 │   ├───what_is_walkeros.mdx (High-level overview of walkerOS)
    4 │   ├───quick_start.mdx (Guide to quickly set up walkerOS)
    5 │   └───event-model.mdx (Detailed explanation of the event structure)
    6 ├───sources/ (Sources)
    7 │   ├───overview.mdx (Overview of source types and features)
    8 │   ├───sources.mdx (Implementation layer for event data creation and state management)
    9 │   ├───walkerjs/ (walker.js (Web))
   10 │   │   ├───index.mdx (Introduction to walker.js web source)
   11 │   │   ├───commands.mdx (Commands for walker.js)
   12 │   │   ├───configuration.mdx (Configuration options for walker.js)
   13 │   │   ├───tagging.mdx (How to tag a page with walker.js)
   14 │   │   ├───testing.mdx (Tips for testing walker.js)
   15 │   │   ├───using-javascript.mdx (How to use JavaScript with walker.js)
   16 │   │   ├───versions.mdx (Version history for walker.js)
   17 │   │   └───installation/ (Installation)
   18 │   │       ├───index.mdx (Overview of installation methods for walker.js)
   19 │   │       ├───package.mdx (Installation via package manager for walker.js)
   20 │   │       ├───script.mdx (Installation via script tag for walker.js)
   21 │   │       └───gtm/ (Google Tag Manager)
   22 │   │           └───index.mdx (Installation via GTM template for walker.js)
   23 │   ├───node/ (Node)
   24 │   │   ├───index.mdx (Introduction to Node source)
   25 │   │   ├───commands.mdx (Commands for Node source)
   26 │   │   ├───configuration.mdx (Configuration options for Node source)
   27 │   │   ├───installation.mdx (Installation for Node source)
   28 │   │   └───versions.mdx (Version history for Node source)
   29 │   └───dataLayer/ (dataLayer)
   30 │       ├───index.mdx (Introduction to dataLayer source)
   31 │       ├───configuration.mdx (Configuration options for dataLayer source)
   32 │       ├───consent_mode.mdx (Use Google Consent Mode with dataLayer source)
   33 │       └───installation.mdx (Installation for dataLayer source)
   34 ├───destinations/ (Destinations)
   35 │   ├───overview.mdx (Overview of destinations)
   36 │   ├───index.mdx (General overview of destinations)
   37 │   ├───configuration.mdx (How to configure walkerOS destinations)
   38 │   ├───event_mapping.mdx (How to transform events for destinations)
   39 │   ├───api.mdx (API destination for custom endpoints)
   40 │   ├───aws.mdx (AWS Firehose destination)
   41 │   ├───bigquery.mdx (Google BigQuery destination)
   42 │   ├───google-ads.mdx (Google Ads destination)
   43 │   ├───google-ga4.mdx (Google Analytics 4 destination)
   44 │   ├───google-gtm.mdx (Google Tag Manager destination)
   45 │   ├───meta.mdx (Meta Conversion API destination)
   46 │   ├───meta-pixel.mdx (Meta Pixel destination)
   47 │   ├───piwikpro.mdx (Piwik PRO destination)
   48 │   └───plausible.mdx (Plausible Analytics destination)
   49 ├───consent_management/ (Consent Management)
   50 │   ├───overview.mdx (Overview of consent management features)
   51 │   ├───index.mdx (Overview of consent management)
   52 │   ├───commands.mdx (Commands for consent management)
   53 │   ├───cookiefirst.mdx (Integration with CookieFirst)
   54 │   ├───cookiepro.mdx (Integration with CookiePro by OneTrust)
   55 │   └───usercentrics.mdx (Integration with Usercentrics)
   56 ├───comparisons/ (Comparisons)
   57 │   ├───comparisons.mdx (Overview of comparisons)
   58 │   └───dataLayer.mdx (Compares dataLayer with walker.js)
   59 ├───contributing.mdx (Guidelines for contributing to the project)
   60 ├───user_stitching.mdx (Explains user identification and user stitching)
   61 └───utils/ (Utils)
   62     ├───index.mdx (Overview of utils)
   63     ├───installation.mdx (How to install utils)
   64     ├───helper.mdx (Core and web helper functions)
   65     ├───hooks.mdx (Detailed explanation of hooks)
   66     ├───mapping.mdx (Detailed explanation of mapping functions)
   67     ├───session.mdx (Detailed explanation of session management)
   68     ├───storage.mdx (Detailed explanation of storage utilities)
   69     ├───tagger.mdx (Helper to generate data-elb attributes)
   70     └───versions.mdx (Version history for utils)

## NEW DOCS STRUCTURE (update)

    1 /website/docs/
    2 ├───getting_started/ (Getting Started)
    3 │   ├───what_is_walkeros.mdx (High-level overview of walkerOS)
    4 │   ├───quick_start.mdx (Guide to quickly set up walkerOS)
    5 │   └───event-model.mdx (Detailed explanation of the event structure)
    6 ├───collectors/ (Collectors)
    7 │   ├───web/ (Web Collector)
    8 │   │   ├───index.mdx (Introduction to web collector)
    9 │   │   ├───commands.mdx (Commands for web collector)
   10 │   │   ├───configuration.mdx (Configuration options for web collector)
   11 │   │   ├───testing.mdx (Tips for testing web collector)
   12 │   │   ├───versions.mdx (Version history for web collector)
   13 │   │   └───installation/ (Installation)
   14 │   │       ├───index.mdx (Overview of installation methods)
   15 │   │       ├───package.mdx (Installation via package manager)
   16 │   │       ├───script.mdx (Installation via script tag)
   17 │   │       └───gtm/ (Google Tag Manager)
   18 │   │           └───index.mdx (Installation via GTM template)
   19 │   └───server/ (Server Collector)
   20 │       ├───index.mdx (Introduction to server collector)
   21 │       ├───commands.mdx (Commands for server collector)
   22 │       ├───configuration.mdx (Configuration options for server collector)
   23 │       ├───installation.mdx (Installation for server collector)
   24 │       └───versions.mdx (Version history for server collector)
   25 ├───destinations/ (Destinations)
   26 │   ├───index.mdx (General overview of destinations)
   27 │   ├───event_mapping.mdx (How to transform events for destinations)
   28 │   ├───web/ (Web Destinations)
   29 │   │   ├───api/ (API)
   30 │   │   │   └───index.mdx (API destination for custom endpoints)
   31 │   │   ├───ga4/ (GA4)
   32 │   │   │   └───index.mdx (Google Analytics 4 destination)
   33 │   │   ├───google_ads/ (Google Ads)
   34 │   │   │   └───index.mdx (Google Ads destination)
   35 │   │   ├───gtm/ (GTM)
   36 │   │   │   └───index.mdx (Google Tag Manager destination)
   37 │   │   ├───meta/ (Meta)
   38 │   │   │   └───index.mdx (Meta Pixel destination)
   39 │   │   ├───piwikpro/ (Piwik PRO)
   40 │   │   │   └───index.mdx (Piwik PRO destination)
   41 │   │   └───plausible/ (Plausible)
   42 │   │       └───index.mdx (Plausible Analytics destination)
   43 │   └───server/ (Server Destinations)
   44 │       ├───aws/ (AWS)
   45 │       │   └───index.mdx (AWS Firehose destination)
   46 │       ├───gcp/ (GCP)
   47 │       │   ├───index.mdx (GCP server package overview)
   48 │       │   └───bigquery.mdx (Google BigQuery destination)
   49 │       └───meta/ (Meta)
   50 │           └───index.mdx (Meta Conversion API destination)
   51 ├───consent_management/ (Consent Management)
   52 │   ├───index.mdx (Overview of consent management)
   53 │   ├───overview.mdx (High-level overview of consent features)
   54 │   ├───commands.mdx (Commands for consent management)
   55 │   ├───cookiefirst.mdx (Integration with CookieFirst)
   56 │   ├───cookiepro.mdx (Integration with CookiePro by OneTrust)
   57 │   └───usercentrics.mdx (Integration with Usercentrics)
   58 ├───sources/ (Sources)
   59 │   ├───index.mdx (Overview of source types and features)
   60 │   ├───html-tagging/ (HTML)
   61 │   │   └───index.mdx (HTML source using data-elb attributes)
   62 │   ├───javascript-elb/ (JavaScript)
   63 │   │   └───index.mdx (JavaScript source using the elb function)
   64 │   └───datalayer/ (dataLayer)
   65 │       └───index.mdx (DataLayer source for processing GTM dataLayer events)
   66 ├───comparisons/ (Comparisons)
   67 │   ├───comparisons.mdx (Overview of comparisons)
   68 │   └───dataLayer.mdx (Compares dataLayer with walker.js)
   69 ├───contributing.mdx (Guidelines for contributing to the project)
   70 ├───user_stitching.mdx (Explains user identification and user stitching)
   71 └───utils/ (Utils)
   72     ├───index.mdx (Overview of utils)
   73     ├───installation.mdx (How to install utils)
   74     ├───helper.mdx (Core and web helper functions)
   75     ├───hooks.mdx (Detailed explanation of hooks)
   76     ├───mapping.mdx (Detailed explanation of mapping functions)
   77     ├───session.mdx (Detailed explanation of session management)
   78     ├───storage.mdx (Detailed explanation of storage utilities)
   79     ├───tagger.mdx (Helper to generate data-elb attributes)
   80     └───versions.mdx (Version history for utils)



