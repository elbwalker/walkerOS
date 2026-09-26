# flow-complete.json: the guide

One real ecommerce setup in one file, taught in 15 chapters. Every feature below
points into [`flow-complete.json`](./flow-complete.json) with an RFC 6901 JSON
Pointer, and every feature id comes from the manifest (`@walkeros/cli/examples`,
`flowCompleteManifest`), so the guide, the docs and the talk name the same
things.

- **Scenario:** a shop with `page view`, `product view`, `product impression`,
  `product add`, `order complete` and `session start`.
- **Three flows:** `web` in the browser, `server` behind it, `warehouse` reading
  the Pub/Sub topic into BigQuery.
- **How to read a chapter:** purpose, features (id, pointer, one line), the
  command lines, the MCP tools, how GTM does it, the doc pages.
- **Where to run the commands:** the walkerOS repo root, where `npx walkeros`
  resolves the workspace CLI. Elsewhere install `@walkeros/cli` (binary
  `walkeros`) and `@walkeros/runner` (binary `runneros`). Lines below are
  written without `npx`.
- **Environment for simulation:** the CLI reads the shell environment, not a
  `.env` file. Run this once in the repo root before the server lines: `GCP_SA`
  holds a service account JSON (a throwaway key is enough for simulation: every
  Google client runs on its mock), `FINGERPRINT_SALT`, `EMAIL_SALT` and
  `META_ACCESS_TOKEN` have no defaults on purpose, and `CUSTOMERS_DIR` points
  the customers store at the demo data. Every other value is `$env.NAME:default`
  and works out of the box.

```bash
export CUSTOMERS_DIR="$PWD/packages/cli/examples/customers"
export FINGERPRINT_SALT=demo-fingerprint-salt EMAIL_SALT=demo-email-salt META_ACCESS_TOKEN=demo-meta-token
export GCP_SA="$(node -e "const { generateKeyPairSync } = require('crypto'); const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }); console.log(JSON.stringify({ type: 'service_account', project_id: 'demo-project', client_email: 'demo@demo-project.iam.gserviceaccount.com', private_key: privateKey }))")"
```

- **There is no `walkeros simulate` and no `walkeros run`:** simulate with
  `walkeros push ... --simulate <kind>.<name>`, run with `walkeros bundle` then
  `runneros start`.

```text
web      usercentrics, session, dataLayer, browser
           -> collector.next: pageGroup
           -> ga4 (to Google, main property)  gtm (dataLayer)  collect (to server)

server   express /collect  /g/collect  /walker.js
           before: one [ G-SUBSITE hit -> ga4Decode -> ga4Consent | *.js -> file (stop) | other /g/collect (stop) ]
           next: dedup
           -> collector.next: fingerprint, bot, not impression -> enrich [ loadUser, sessionSave, sessionLoad, validate ]
           -> pubsub (every event, email pseudonymized)
           -> meta, piwikpro, datamanager (each behind eventFilter)

warehouse  pubsub pull -> bigquery (keeps everything)
```

## Part I: see it work

## tour: One file, one event

- **Purpose:** see the whole file pass the strict check, then watch one event
  come out of a source.
- **Features:**
  - `schema-url` at `/$schema`: The JSON Schema gives editors and agents
    completion and checks for every field.
  - `format-version` at `/version`: version 4 is the flow file format this file
    is written in.
  - `flows-multi` at `/flows`: One file holds three flows: web in the browser,
    server behind it, warehouse reading the topic.
  - `platform` at `/flows/web/config/platform`: platform decides how a flow is
    built: a browser bundle or a server artifact.
  - `flow-config` at `/flows/web/config`: config holds what the build needs:
    platform, url, settings, bundle, observe.
  - `flow-sources` at `/flows/web/sources`: Sources turn whatever happens (a CMP
    decision, a dataLayer push, a click) into events.
  - `flow-transformers` at `/flows/server/transformers`: Transformers are named
    hops that validate, enrich, filter or remember events.
  - `flow-destinations` at `/flows/server/destinations`: Destinations fan out:
    every event reaches each destination that accepts it.
  - `flow-collector` at `/flows/server/collector`: The collector sits between
    sources and destinations and runs its own chain once per event.
- **CLI:** strict validation checks the schema, every reference, every package
  version and every example link; this file gives 0 errors, 0 warnings.

```bash
walkeros validate packages/cli/examples/flow-complete.json --strict
walkeros push packages/cli/examples/flow-complete.json -f web -e '{"name":"page view"}' --simulate source.browser
```

- The second line starts the browser source in a simulated page and prints the
  page view it captures (`trigger: "load"`, `source.type: "browser"`).
- **MCP:** `flow_validate`, `flow_simulate`, `flow_load`.
- **In GTM:** preview mode on one container; here one file holds the browser,
  the server and the warehouse, and all three are checked together.
- **Docs:** `getting-started/flow/index`, `collector/index`.

## web-entry: Start where the shop already is

- **Purpose:** capture events from what the page already has: the Usercentrics
  banner, the dataLayer the shop pushes to, data-elb tagging.
- **Features:**
  - `cmp-usercentrics` at `/flows/web/sources/usercentrics`: The Usercentrics
    source turns the banner decision into a walker consent command.
  - `session-source` at `/flows/web/sources/session`: The session source sets
    user.session and user.device and emits session start with the raw click id.
  - `datalayer-source` at `/flows/web/sources/dataLayer`: The dataLayer source
    reads the pushes the shop already makes, so nothing on the page changes.
  - `source-require` at `/flows/web/sources/dataLayer/config/require`: require
    holds the source until consent and session are known.
  - `source-mapping` at `/flows/web/sources/dataLayer/config/mapping`: Source
    mapping renames dataLayer add_to_cart to product add and picks its fields.
  - `browser-source` at `/flows/web/sources/browser`: The browser source reads
    data-elb tagging: page views, clicks and impressions.
  - `source-primary` at `/flows/web/sources/browser/primary`: primary names the
    source whose instance the flow exposes, here the browser elb.
  - `browser-pageview` at `/flows/web/sources/browser/config/settings/pageview`:
    pageview: true sends a page view on load without tagging.
  - `collector-globals` at `/flows/web/collector/globals`: globals.language is
    the default the page can override; the contract requires it.
  - `collector-globals-static` at `/flows/web/collector/globalsStatic`:
    globalsStatic survives a run reset; the site id belongs there.
  - `collector-custom` at `/flows/web/collector/custom`: custom carries values
    for the pipeline that are not event data.
  - `config-url` at `/flows/web/config/url`: url says where a flow lives; other
    flows reach it with $flow.
  - `config-settings` at `/flows/web/config/settings`: Platform settings:
    windowCollector names the global collector instance.
- `require: ["consent", "session"]` on the dataLayer source means nothing is
  read before the banner decision and the session are known.
- The browser source is `primary`: its `elb` is the one the page calls.
- Usercentrics and session examples are shown in the browser (their simulation
  in jsdom is still waiting), the dataLayer and browser examples simulate.
- **CLI:** the tour line above (`--simulate source.browser`); the same form
  works for `source.dataLayer`.
- **MCP:** `package_get` (source schemas and examples), `flow_simulate`.
- **In GTM:** a consent initialization trigger plus a CMP template, and the
  container reading the same dataLayer.
- **Docs:** `guides/session`, `collector/index`.

## server-entry: A first-party endpoint, and a GA4 migration path

- **Purpose:** one express source answers the browser (`/collect`), GA4 hits of
  a sub-site (`/g/collect`) and script requests (`/walker.js`).
- **Features:**
  - `server-url` at `/flows/server/config/url`: The full collect endpoint, local
    by default, SERVER_URL in production.
  - `express-paths` at `/flows/server/sources/express/config/settings/paths`:
    One route per job, each with its own methods: /collect, /g/collect,
    /walker.js.
  - `express-port` at `/flows/server/sources/express/config/settings/port`: port
    lets push --simulate start the source; runneros mounts the handler on its
    own port.
  - `express-cors` at `/flows/server/sources/express/config/settings/cors`: CORS
    response headers for the shop origin; express adds X-Content-Type-Options
    itself.
  - `source-ingest` at `/flows/server/sources/express/config/ingest`: ingest
    keeps the request context (ip, path, headers) for later steps without
    putting it on the event.
  - `ingest-headers` at
    `/flows/server/sources/express/config/ingest/map/userAgent`: Request headers
    are read by path: headers.user-agent, headers.accept-language.
  - `source-async` at `/flows/server/sources/express/config/async`: POST answers
    at once; GET waits so a step can answer with real content.
  - `ga4-decode` at `/flows/server/transformers/ga4Decode`: GA4 hits from a
    sub-site not yet migrated (its own property) become events; the main site
    never sends here and hits of any other property are not decoded, so nothing
    counts twice.
- **CORS and request headers:** `settings.cors` sets the CORS response headers
  for the shop origin; `config.ingest` reads request headers by path
  (`headers.user-agent`, `headers.accept-language`) into `ingest`, where later
  steps read them without putting them on the event.
- **GA4 migration path, no double counting:**
  - GA4 hits from a sub-site not yet migrated (its own property) become events;
    the main site never sends here and hits of any other property are not
    decoded, so nothing counts twice.
  - The sub-site property is `G-SUBSITE`: its gtag transport points at our
    server, and the route decodes only hits whose `tid` is `G-SUBSITE`.
  - The main-site property is `G-MAINSITE`: the web `ga4` destination sends it
    straight to Google, never to this server.
  - Sub-site traffic arrives only via `/g/collect`, main-site traffic only via
    `/collect`.
  - walkerOS has no server GA4 destination, so decoded hits are forwarded to
    other tools, never back to GA4.
  - Decoded hits carry the browser language (`ul`, e.g. `en-us`) in
    `user.language`; `ga4Consent` derives `globals.language` from it (`en`, or
    `na` when the hit has none), so a decoded hit with analytics consent passes
    the contract and reaches the vendors like any other event.
- **CLI:** build the server artifact, then run it. `GCP_SA` must be set (Pub/Sub
  and Data Manager read it as credentials); no step calls Google at start, so a
  throwaway key is enough to become ready and serve `walker.js`, while pushes to
  Pub/Sub and Data Manager need a real one. The artifact carries `shared/` but
  not the demo customers: set `CUSTOMERS_DIR` to the absolute path of
  `packages/cli/examples/customers` in `.env`. The env file must be private
  (`chmod 600 .env`), `runneros` refuses a group-readable one.

```bash
walkeros bundle packages/cli/examples/flow-complete.json -f server -o dist/server.mjs
chmod 600 .env
runneros start dist/server.mjs -p 8080 --env-file .env
```

- One GA4 hit from the sub-site and the script (the event reaches Pub/Sub only
  with a real key; the same requests run in the flow's integration test over
  HTTP):

```bash
curl -X POST 'http://localhost:8080/g/collect?v=2&tid=G-SUBSITE&cid=555.1&en=page_view&dl=https%3A%2F%2Fsub.example.com%2F'
curl -I http://localhost:8080/walker.js
```

- **MCP:** `flow_bundle`, `package_get` (`@walkeros/transformer-ga4`,
  `@walkeros/server-source-express`).
- **In GTM:** a server container client for GA4.
- **Docs:** `guides/reference-syntax` (ingest paths).

## step-envelope: One step shape

- **Purpose:** every source, transformer, destination and store has the same
  envelope, and its `examples` are the contract of the step.
- **Features:**
  - `step-package` at `/flows/server/destinations/meta/package`: package names
    the npm package that implements a step.
  - `step-import` at `/flows/server/destinations/pubsub/import`: import picks a
    named export when one package ships several steps.
  - `step-code` at `/flows/web/transformers/pageGroup/code`: code defines a step
    inline, no package needed.
  - `code-push` at `/flows/web/transformers/pageGroup/code/push`: push is the
    step function, written as $code.
  - `code-type` at `/flows/web/transformers/pageGroup/code/type`: type names the
    inline step in logs and Observe.
  - `step-config` at `/flows/server/destinations/meta/config`: config is the
    same envelope for every step kind: settings, mapping, consent, reliability.
  - `step-settings` at `/flows/server/destinations/meta/config/settings`:
    settings are the package options, checked against the package schema.
  - `step-env` at `/flows/server/transformers/file/env`: env injects what a step
    uses at runtime, here the assets store.
  - `step-examples` at `/flows/web/destinations/ga4/examples`: examples are the
    contract of a step: this in gives this out, checked by simulation.
  - `example-title` at `/flows/web/destinations/ga4/examples/purchase/title`:
    title names the example.
  - `example-description` at
    `/flows/web/destinations/ga4/examples/purchase/description`: description is
    the one teaching sentence the docs render.
  - `example-public` at `/flows/web/destinations/ga4/examples/purchase/public`:
    public marks the one example per step the docs show first.
  - `example-in` at `/flows/web/destinations/ga4/examples/purchase/in`: in is
    what the step receives.
  - `example-out` at `/flows/web/destinations/ga4/examples/purchase/out`: out is
    what the step does, as effects: gtag calls, a return, a request.
  - `example-mapping` at
    `/flows/web/destinations/ga4/examples/purchase/mapping`: mapping shows the
    rule the example exercises.
  - `example-trigger` at
    `/flows/web/sources/browser/examples/productImpression/trigger`: trigger
    says how a source example fires: load, click, impression.
  - `example-command` at
    `/flows/web/destinations/ga4/examples/consentUpdate/command`: command routes
    in through a walker command instead of an event, here consent.
- **CLI:** check one step against its package schema, then run a destination
  example by hand.

```bash
walkeros validate packages/cli/examples/flow-complete.json -f web --path destinations.collect
walkeros push packages/cli/examples/flow-complete.json -f web -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"}}' --simulate destination.ga4
```

- The second line prints `mapping: none (skipped before mapping)`: the event has
  no functional consent, so GA4 never sees it (see `consent-privacy`).
- Any example `in` is a ready fixture:
  `jq .flows.server.destinations.meta.examples.purchase.in packages/cli/examples/flow-complete.json > events/order-complete.json`.
- **MCP:** `flow_examples`, `flow_simulate`, `package_get`.
- **In GTM:** a tag template with its fields; here the same envelope carries
  settings, mapping, consent and reliability for every step kind.
- **Docs:** `getting-started/flow/step-examples`.

## Part II: shape the data

## mapping: Vendor mapping

- **Purpose:** turn walkerOS events into vendor calls, one rule per entity and
  action, with values read, computed, looped and defaulted (London prompt 2).
- **Features:**
  - `ga4-purchase` at
    `/flows/web/destinations/ga4/config/mapping/order/complete`: order complete
    becomes a GA4 purchase with value, currency and items.
  - `destination-mapping` at `/flows/web/destinations/ga4/config/mapping`:
    mapping holds one rule per entity and action.
  - `rule-name` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/name`: name is
    the vendor event name.
  - `rule-data` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data`: data
    builds the vendor parameters from the event.
  - `value-map` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map`: map
    builds an object key by key.
  - `value-key` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map/coupon/key`:
    key reads a path from the event.
  - `value-fn` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map/value/fn`:
    fn computes a value from the event, here the total rounded to cents. fn and
    key are alternatives: next to a key, fn never runs.
  - `value-loop` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map/items/loop`:
    loop turns nested products into GA4 items.
  - `value-condition` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map/coupon/condition`:
    A value condition sends coupon only when the order has one.
  - `value-fallback` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/data/map/currency`:
    An array of values is a fallback list: the event currency, else the flow
    default.
  - `value-set` at
    `/flows/web/destinations/ga4/config/mapping/product/view/data/map/items/set`:
    set builds an array, here the one item of a product view.
  - `value-value` at
    `/flows/server/destinations/meta/config/mapping/product/add/data/map/currency/value`:
    value is a constant.
  - `rule-condition` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/condition`: A
    rule condition skips the rule, here for orders without a total.
  - `rule-settings` at
    `/flows/server/destinations/piwikpro/config/mapping/order/complete/settings`:
    Rule settings are per-event package options: the Piwik PRO goal for orders.
  - `mapping-wildcard-ignore` at
    `/flows/server/destinations/meta/config/mapping/*/*/ignore`: A wildcard rule
    with ignore sends Meta only what is mapped.
  - `destination-include` at `/flows/web/destinations/ga4/config/include`:
    include flattens whole sections into parameters, here the globals.
  - `rule-extend` at
    `/flows/server/transformers/ga4Decode/config/settings/mapping/purchase/extend`:
    extend patches a package default rule instead of replacing it.
  - `rule-remove` at
    `/flows/server/transformers/ga4Decode/config/settings/mapping/purchase/remove`:
    remove drops fields from the default rule output.
- **CLI:** the GA4 purchase, with consent and one product:

```bash
walkeros push packages/cli/examples/flow-complete.json -f web -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"},"nested":[{"entity":"product","data":{"id":"SKU-1","name":"Linen shirt","price":74.9,"quantity":2}}],"consent":{"functional":true}}' --simulate destination.ga4
```

- Output:
  `call window.gtag("event","purchase",{... "transaction_id":"ORD-100","value":149.8,"currency":"EUR","items":[{"item_id":"SKU-1",...}],"send_to":"G-MAINSITE"})`,
  with the globals flattened in by `include`.
- **MCP:** `package_get` (mapping hints), `flow_simulate`.
- **In GTM:** a GA4 event tag with an ecommerce variable per field.
- **Docs:** `getting-started/flow/step-examples`.

## consent-privacy: Consent and personal data

- **Purpose:** consent at the destination, the rule and the field; `policy`
  before mapping; what happens to the email and the IP address.
- **Features:**
  - `cmp-category-map` at
    `/flows/web/sources/usercentrics/config/settings/categoryMap`: categoryMap
    maps CMP categories onto exactly the consent keys the contract names.
  - `cmp-explicit-only` at
    `/flows/web/sources/usercentrics/config/settings/explicitOnly`: explicitOnly
    publishes consent only after a real decision, so consent.functional present
    means the user decided.
  - `session-consent` at `/flows/web/sources/session/config/settings/consent`:
    Storage for session ids waits for the functional consent key.
  - `ga4-consent-map` at `/flows/server/transformers/ga4Consent`: A mapping hop
    after the decoder copies GA4 analytics storage into functional and derives
    the page language from the browser language (na when the hit has none);
    refused pings stay functional false and fail the contract.
  - `destination-consent` at `/flows/server/destinations/meta/config/consent`:
    Destination consent: Meta only gets events with marketing consent.
  - `rule-consent` at
    `/flows/web/destinations/ga4/config/mapping/order/complete/consent`: Rule
    consent on purchases: functional, like the destination; marketing consent
    belongs to Meta and Data Manager.
  - `value-consent` at
    `/flows/web/destinations/collect/config/policy/user.email/consent`: Field
    consent: the email is only kept with marketing consent.
  - `destination-policy` at `/flows/web/destinations/ga4/config/policy`: policy
    rewrites the event before mapping, here a currency fallback.
  - `rule-policy` at
    `/flows/server/destinations/meta/config/mapping/order/complete/policy`: Rule
    policy sets the event id to the order id, so Meta can match it with the
    browser pixel.
  - `meta-hashing` at
    `/flows/server/destinations/meta/config/settings/user_data/em`: Meta
    normalizes and hashes em itself; the flow never handles a hash.
  - `value-validate` at
    `/flows/server/destinations/meta/config/settings/user_data/em/validate`:
    validate drops a value that does not look like an email.
  - `ingest-ip-raw` at `/flows/server/sources/express/config/ingest/map/ip`: The
    raw ip stays in ingest: Meta needs it, fingerprint anonymizes it itself.
  - `email-pseudonymize` at `/flows/server/transformers/pseudonymize`: Before
    Pub/Sub the email becomes a stable keyed hash (HMAC-SHA256, EMAIL_SALT);
    Meta and Data Manager keep the raw email and hash it themselves.
  - `pubsub-before` at `/flows/server/destinations/pubsub/before`: A conditional
    next on Pub/Sub runs pseudonymize only when an email exists; other events
    pass untouched.
  - `ga4-como` at `/flows/web/destinations/ga4/config/settings/como`: como turns
    walker consent into Google Consent Mode calls.
- **Consent keys:** there are no collector consent defaults, only granted keys
  travel. `consent.functional` is set only by Usercentrics with `explicitOnly`,
  so its presence means the user decided.
- **Meta hashes `user_data` itself:** `em` is the raw email; the Meta package
  normalizes and hashes it before sending, the flow never builds a hash for
  Meta.
- **Email in the warehouse:** before Pub/Sub, the `pseudonymize` step
  (`@walkeros/server-transformer-fingerprint`, HMAC-SHA256 with `EMAIL_SALT`, no
  rotation) replaces `user.email` with a keyed hash, so the warehouse never
  stores a raw email; Meta and Data Manager receive the raw email and hash it
  themselves.
- **CLI:** the step-envelope line shows the consent skip; this one shows Meta
  and Piwik PRO with request context from `--ingest`:

```bash
walkeros push packages/cli/examples/flow-complete.json -f server -e events/order-complete.json --ingest '{"ip":"203.0.113.7","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36"}' --simulate destination.meta --simulate destination.piwikpro
```

- Output:
  `call sendServer("https://graph.facebook.com/v22.0/1234567890/events", ... "event_id":"ORD-100" ... "client_ip_address":"203.0.113.7" ...)`
  and the Piwik PRO hit; credentials never appear in the output.
- **MCP:** `flow_simulate`, `package_get` (`@walkeros/server-destination-meta`).
- **In GTM:** consent settings per tag plus Consent Mode.
- **Docs:** `guides/session`.

## gtm-fed: GTM stays, fed by walkerOS

- **Purpose:** keep the GTM container and feed it walkerOS events, without the
  dataLayer source reading them back.
- **Features:**
  - `gtm-mode` at `/flows/web/destinations/gtm/config/settings/gtm`: GTM stays:
    the gtag destination in GTM mode pushes walkerOS events into its dataLayer.
  - `destination-data` at `/flows/web/destinations/gtm/config/data`: Destination
    data sends consent, globals, user and data with every GTM push.
  - `gtm-names` at
    `/flows/web/destinations/gtm/config/mapping/product/add/name`: GTM-bound
    names start with elb, so the dataLayer source can skip them.
  - `datalayer-filter` at `/flows/web/sources/dataLayer/config/settings/filter`:
    The filter skips gtag arguments pushes and elb names: without it the page
    loops.
  - `gtm-echo-stop` at `/flows/web/destinations/gtm/before`: An event read from
    the dataLayer never goes back to GTM.
  - `load-script` at `/flows/web/destinations/ga4/config/loadScript`: loadScript
    lets the destination load gtag.js itself.
- **Loop guard, two parts:** the dataLayer `filter` skips gtag `arguments`
  pushes and every name starting with `elb `; the `gtm` destination's `before`
  stops events whose `source.type` is `dataLayer`, so GTM never gets back what
  it pushed.
- The `gtm` examples are shown in the browser (their simulation needs consent
  seeding and is still waiting).
- **CLI:** none of its own; `walkeros validate ... --strict` checks the
  destination schema.
- **MCP:** `package_get` (`@walkeros/web-destination-gtag`).
- **In GTM:** triggers on `elb product add` and `elb order complete`, variables
  reading `consent`, `globals`, `user` and `data`.
- **Docs:** `getting-started/flow/routing`.

## references: Values from outside the file

- **Purpose:** every id, token, topic and dataset comes from a reference;
  resolution order step over flow over root.
- **Features:**
  - `root-variables` at `/variables`: Root variables are shared by all flows; a
    flow or a step can override them.
  - `flow-variables` at `/flows/server/variables`: Flow variables win over root
    variables for one flow.
  - `step-variables` at `/flows/server/destinations/piwikpro/variables`: Step
    variables win over flow and root variables for one step.
  - `ref-var-whole` at
    `/flows/web/destinations/ga4/config/policy/data.currency/1/value`: A
    whole-string $var keeps the variable type.
  - `ref-var-deep` at
    `/flows/server/destinations/pubsub/config/settings/projectId`:
    $var.gcp.project reads a path inside a variable.
  - `ref-var-inline` at
    `/flows/warehouse/sources/pubsub/config/setup/deadLetterPolicy/deadLetterTopic`:
    Inside a longer string $var is replaced in place, here in a full topic name.
  - `ref-env` at `/flows/server/transformers/fingerprint/config/settings/salt`:
    $env without a default must be set: a secret salt never gets a public
    default.
  - `ref-env-default` at `/variables/gcp/project`: $env.NAME:default works out
    of the box and takes the environment value when set.
  - `ref-secret` at `/flows/server/destinations/pubsub/config/credentials`:
    $secret is read at start and never baked into an artifact; web flows reject
    it.
  - `ref-flow` at `/flows/web/destinations/collect/config/settings/url`:
    $flow.server.url points the browser at the server flow; it is whole-string
    only.
  - `ref-code` at `/flows/web/destinations/collect/config/settings/transform`:
    $code: puts a function into JSON.
  - `ref-contract` at
    `/flows/server/transformers/validate/config/settings/contract/0`:
    $contract.server hands the resolved contract to the validate step.
  - `ref-store` at `/flows/server/transformers/file/env/store`: $store.assets
    injects a store into a step.
  - `bundle-env` at `/flows/web/config/bundle/env`: Web $env is resolved at
    build time from this declared set, so every build is the same.
- **Kinds:** `$var` (whole, deep, inline), `$env.NAME` and `$env.NAME:default`,
  `$secret`, `$flow`, `$code:`, `$contract`, `$store`.
- **Secrets:** `$secret` is used only for `GCP_SA`, on the server and in the
  warehouse; web flows reject `$secret`.
- **CLI:** `runneros` reads a private env file:

```bash
runneros start dist/server.mjs -p 8080 --env-file .env
```

- **MCP:** `flow_validate` (unresolved inline references are named).
- **In GTM:** constant and lookup table variables, per workspace.
- **Docs:** `guides/reference-syntax`.

## Part III: build the pipeline

## chains-routing: Chains and routes

- **Purpose:** decide per event which steps run: `source.before` on the raw
  request, `source.next`, `collector.next` once per event, `destination.before`
  per destination (London prompt 3).
- **Features:**
  - `web-collector-next` at `/flows/web/collector/next`: On the web
    collector.next runs the inline pageGroup step once per event.
  - `ga4-other-dropped` at `/flows/server/sources/express/before/one/2`: GA4
    hits for any other property stop at the route instead of reaching the
    collector undecoded.
  - `source-before` at `/flows/server/sources/express/before`: source.before
    runs on the raw request, before an event exists.
  - `route-one` at `/flows/server/sources/express/before/one`: one takes the
    first matching branch; no match falls through.
  - `match-and` at `/flows/server/sources/express/before/one/0/match/and`: and
    needs every condition.
  - `op-prefix` at
    `/flows/server/sources/express/before/one/0/match/and/0/operator`: prefix
    matches the start of a value.
  - `op-regex` at
    `/flows/server/sources/express/before/one/0/match/and/1/operator`: regex
    matches a pattern: only hits of the sub-site property are decoded.
  - `op-suffix` at `/flows/server/sources/express/before/one/1/match/operator`:
    suffix matches the end of a value: script requests end in .js.
  - `source-next` at `/flows/server/sources/express/next`: source.next names the
    hop after the source, here dedup.
  - `collector-next` at `/flows/server/collector/next`: collector.next runs once
    per event before the fan-out: fingerprint and bot for all, enrich for all
    but impressions.
  - `route-next-match` at `/flows/server/collector/next/2`: A conditional next
    (match plus next) runs the target only when the match holds; otherwise the
    chain goes on.
  - `match-not` at `/flows/server/collector/next/2/match/not`: not inverts a
    condition: everything that is not an impression.
  - `code-free-hop` at `/flows/server/transformers/enrich`: A step with only
    next is a named chain other routes can call.
  - `route-sequence` at `/flows/server/transformers/enrich/next`: A list mixing
    conditional next entries and step ids is a sequence: each match decides in
    turn, validate always runs last.
  - `transformer-next` at `/flows/server/transformers/eventFilter/next`: A
    transformer next continues the chain after the step.
  - `op-exists` at `/flows/server/transformers/enrich/next/0/match/operator`:
    exists checks that a path has a value: only logged-in events load the
    customer.
  - `op-eq` at `/flows/server/transformers/enrich/next/1/match/operator`: eq
    compares as strings.
  - `destination-before` at `/flows/server/destinations/meta/before`:
    destination.before runs for one destination only; a stop there skips just
    that one.
  - `event-filter` at `/flows/server/transformers/eventFilter`: eventFilter
    keeps impressions, likely bots and invalid events from Meta, Piwik PRO and
    Data Manager; Pub/Sub keeps everything.
  - `route-stop` at `/flows/server/transformers/eventFilter/next/stop`: stop
    with a match drops the event at that point.
  - `match-or` at `/flows/server/transformers/eventFilter/next/match/or`: or
    needs any condition.
  - `event-filter-impression` at
    `/flows/server/transformers/eventFilter/next/match/or/0`: Impressions stay
    out of Meta and Piwik PRO but reach the warehouse.
  - `op-gt` at
    `/flows/server/transformers/eventFilter/next/match/or/1/operator`: gt
    compares numbers.
  - `stop-unconditional` at `/flows/server/transformers/file/next`: An
    unconditional stop: a script request never becomes an event.
- **Words:** a conditional next is `{ match, next }`; `one` takes the first
  matching branch; `stop` ends the chain (with a `match`, only when it holds).
- **Not used here, with a pointer:** `many`, `destination.next` and
  `transformer.before` have no genuine use in this scenario; see `routeCases` in
  `@walkeros/core/dev` (`core/src/examples/route-cases.ts`).
- **CLI:** the collector chain for an impression (fingerprint and bot run,
  `enrich` does not), and `eventFilter` alone (no events come out):

```bash
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"product impression","trigger":"impression","data":{"id":"SKU-1"}}' --simulate collector.default
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"product impression","trigger":"impression","data":{"id":"SKU-1"}}' --simulate transformer.eventFilter
```

- **MCP:** `flow_simulate`, `flow_validate`.
- **In GTM:** trigger conditions and exceptions per tag.
- **Docs:** `getting-started/flow/routing`.

## contract: The contract and the validate step

- **Purpose:** write down what every event must carry, check it at runtime, and
  keep invalid events from the vendors (London prompt 4).
- **Features:**
  - `contract-default` at `/contract/default`: The contract names what every
    event must carry; the validate step and validate --strict read it.
  - `contract-extend` at `/contract/server/extend`: server extends default with
    what the server adds: the visitor hash.
  - `contract-server-hash` at
    `/contract/server/schema/properties/user/properties/hash`: The description
    tells analysts what user.hash is and how to count it.
  - `contract-tagging` at `/contract/default/tagging`: tagging is the contract
    version the tagging follows.
  - `contract-description` at `/contract/default/description`: description says
    what the contract is for.
  - `contract-schema` at `/contract/default/schema`: schema applies to every
    event: functional consent is a hard gate, language a required global.
  - `contract-events` at `/contract/default/events`: events hold one JSON Schema
    per entity and action.
  - `contract-wildcard` at `/contract/default/events/product/*`: product \*
    applies to every product action.
  - `validate-transformer` at `/flows/server/transformers/validate`: validate
    checks each event against $contract.server at runtime.
  - `validate-pass` at
    `/flows/server/transformers/validate/config/settings/mode`: mode pass marks
    source.valid instead of dropping, so the warehouse keeps violations; strict
    is the hard gate.
  - `event-filter-valid` at
    `/flows/server/transformers/eventFilter/next/match/or/2`: Only events that
    match the contract reach the vendors.
- **Gate semantics:** `validate` runs in `mode: "pass"`: it marks `source.valid`
  and never drops, so the warehouse keeps violations. The `eventFilter` clause
  `event.source.valid eq false` stops invalid events before Meta, Piwik PRO and
  Data Manager only. `mode: "strict"` is the hard-gate variant: it drops invalid
  events for every destination, the warehouse included.
- **CLI:** `validate --strict` on the flow checks the contract's shape; the
  contract check proper (`-t contract`, which also resolves every `extend`)
  takes the contract section alone. Then run the validate step on an order
  without a visitor hash (out: `source.valid: false`):

```bash
walkeros validate "$(jq .contract packages/cli/examples/flow-complete.json)" -t contract
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"},"globals":{"language":"en"},"consent":{"functional":true}}' --simulate transformer.validate
```

- **MCP:** `flow_validate`, `flow_simulate`.
- **In GTM:** no equivalent; a custom template per tag at best.
- **Docs:** `getting-started/flow/contract`, `transformers/validate`.

## quality: Duplicates, bots and a cookieless id

- **Purpose:** drop transport resends, send each order to Meta once (London
  prompt 5), score bots, and give Piwik PRO a cookieless visitor id.
- **Features:**
  - `dedup-by-event-id` at `/flows/server/transformers/dedup/cache`: A resend
    with the same event id is stopped for an hour.
  - `cache-stop` at `/flows/server/transformers/dedup/cache/stop`: stop: true
    turns a cache hit into a drop.
  - `cache-namespace` at `/flows/server/transformers/dedup/cache/namespace`:
    namespace keeps cache keys of different steps apart.
  - `cache-rules` at `/flows/server/transformers/dedup/cache/rules`: rules say
    which events are cached, by which key, for how long.
  - `cache-key` at `/flows/server/transformers/dedup/cache/rules/0/key`: key is
    a list of paths; together they identify a duplicate.
  - `cache-ttl` at `/flows/server/transformers/dedup/cache/rules/0/ttl`: ttl in
    seconds.
  - `order-dedup-meta` at `/flows/server/destinations/meta/cache`: A thank-you
    page reload gets a new event id for the same order; Meta gets each order
    once.
  - `cache-rule-match` at `/flows/server/destinations/meta/cache/rules/0/match`:
    A rule match limits the cache to order complete.
  - `bot-score` at `/flows/server/transformers/bot`: bot annotates user.botScore
    and botCategory from the request; it never drops.
  - `event-filter-bot` at
    `/flows/server/transformers/eventFilter/next/match/or/1`: A botScore above
    50 keeps the event from the vendors.
  - `fingerprint` at `/flows/server/transformers/fingerprint`: A cookieless
    visitor id rotating daily, for Piwik PRO; it is not hashing of personal
    data.
  - `piwik-visitor-id` at
    `/flows/server/destinations/piwikpro/config/settings/visitorId`: Device,
    then session, then the cookieless hash: the first one present is the visitor
    id.
  - `piwikpro` at `/flows/server/destinations/piwikpro`: Piwik PRO from the
    server, EU hosted, with the cookieless id as fallback.
- **Fingerprint is a cookieless visitor id for Piwik PRO:** a daily rotating
  HMAC over the anonymized IP, browser and site; it is not hashing of personal
  data.
- **CLI:** fingerprint with request context, and the collector chain with the
  bot result mocked as a likely bot:

```bash
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"page view","data":{"title":"Home"}}' --ingest '{"ip":"203.0.113.7","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36","origin":"https://www.example.com"}' --simulate transformer.fingerprint
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"page view","data":{"title":"Home"}}' --simulate collector.default --mock collector.next.bot='{"name":"page view","data":{"title":"Home"},"user":{"botScore":80,"botCategory":"automation"}}'
```

- **MCP:** `flow_simulate`, `package_get` (`@walkeros/server-transformer-bot`,
  `@walkeros/server-transformer-fingerprint`).
- **In GTM:** a custom template with a Firestore lookup for order dedup; no
  built-in bot score.
- **Docs:** `collector/cache`, `transformers/bot`, `transformers/fingerprint`.

## state-stores: State, stores and first-party walker.js

- **Purpose:** remember across requests, read from stores, and serve the web
  bundle from the server.
- **Features:**
  - `flow-stores` at `/flows/server/stores`: Stores hold data the steps read:
    script files and customer records.
  - `state-set` at `/flows/server/transformers/sessionSave/state`: state set
    remembers the gclid and start time of a session in the built-in cache.
  - `state-get` at `/flows/server/transformers/sessionLoad/state`: state get
    restores it on the order, per instance.
  - `state-key` at `/flows/server/transformers/sessionSave/state/key`: The key
    falls back from the session id to the visitor hash.
  - `state-value` at `/flows/server/transformers/sessionSave/state/value`: value
    maps what is stored.
  - `state-store` at `/flows/server/transformers/loadUser/state/store`: store
    reads from a named store instead of the built-in cache.
  - `load-user` at `/flows/server/transformers/loadUser`: loadUser puts the
    customer lifetime value on logged-in events.
  - `store-fs` at `/flows/server/stores/assets`: An fs store serves files from a
    folder.
  - `store-file` at `/flows/server/stores/assets/config/file`: file: true
    returns bytes exactly as stored.
  - `store-customers` at `/flows/server/stores/customers`: Customer records come
    from an fs store with fake demo data; in production a Sheets or GCS store
    takes its place, loadUser stays as it is.
  - `store-cache` at `/flows/server/stores/customers/cache`: Store cache
    memoizes customer reads for five minutes.
  - `file-transformer` at `/flows/server/transformers/file`: walker.js is served
    first party from the server flow.
  - `file-headers` at `/flows/server/transformers/file/config/settings/headers`:
    Default response headers for served files: caching and resource policy.
  - `gclid-to-ads` at
    `/flows/server/destinations/datamanager/config/mapping/order/complete/data/map/gclid`:
    The gclid saved at session start reaches Google Ads with the purchase.
- **Built-in `__cache`:** `sessionSave` and `sessionLoad` omit `store`, so they
  use the LRU cache every collector creates. It is per instance: a second
  instance does not see it; a shared store is a later build.
- **`$store` and store `cache`:** `$store.assets` injects the fs store into
  `file`; the `customers` store memoizes customer reads for five minutes.
- **Customers:** `customers` is an fs store over fake demo data
  (`packages/cli/examples/customers`, one JSON value per customer id), outside
  root `include`, so no customer data ships in a bundle. `basePath` is relative
  to the working directory, so `CUSTOMERS_DIR` holds it as an absolute path (the
  setup block at the top exports it). In production a Sheets or GCS store takes
  its place; `loadUser` does not change.
- **walker.js first party:** the `file` transformer answers `GET /walker.js`
  from the `assets` store with `settings.headers` (`Cache-Control`,
  `Cross-Origin-Resource-Policy`) and ends with `next: { stop: true }`. Express
  `settings.cors` adds the CORS headers.
- **Why `X-Content-Type-Options: nosniff` is not in the file:** express sets it
  on every response itself.
- The `file` example is proven over HTTP in the integration test; its simulation
  is still waiting.
- **CLI:** a known customer gets its lifetime value (`user.ltv: 420`):

```bash
walkeros push packages/cli/examples/flow-complete.json -f server -e '{"name":"order complete","data":{"id":"ORD-100","total":149.8,"currency":"EUR"},"user":{"id":"cust-42"}}' --simulate transformer.loadUser
```

- Build the web bundle straight into the shared folder (web builds ignore root
  `include`):

```bash
walkeros bundle packages/cli/examples/flow-complete.json -f web -o packages/cli/examples/shared/walker.js
```

- **MCP:** `flow_bundle`, `package_get` (`@walkeros/server-store-fs`; for the
  production swap `@walkeros/server-store-sheets`).
- **In GTM:** a server container can serve `gtm.js` first party; there is no
  general store.
- **Docs:** `collector/state`, `collector/cache`, `transformers/file`.

## Part IV: ship and operate

## delivery: Reliable delivery and the warehouse

- **Purpose:** every event raw into Pub/Sub, a warehouse flow into BigQuery,
  vendors with breakers and timeouts.
- **Features:**
  - `collect-api` at `/flows/web/destinations/collect`: collect sends every
    event to the first-party server.
  - `collect-transform` at
    `/flows/web/destinations/collect/config/settings/transform`: transform trims
    the payload before it leaves the browser.
  - `pubsub-raw` at `/flows/server/destinations/pubsub`: Pub/Sub gets every
    event raw, impressions, bots and violations included.
  - `destination-setup` at `/flows/server/destinations/pubsub/config/setup`:
    setup provisions the topic, EU storage regions included.
  - `destination-credentials` at
    `/flows/server/destinations/datamanager/config/credentials`:
    config.credentials takes the service account from $secret.
  - `breaker` at `/flows/server/destinations/pubsub/config/breaker`: breaker
    pauses a failing destination instead of hammering it.
  - `timeout` at `/flows/server/destinations/pubsub/config/timeout`: timeout
    bounds each push.
  - `dlq-max` at `/flows/server/destinations/pubsub/config/dlqMax`: dlqMax
    bounds the dead letter queue of failed events.
  - `batch` at `/flows/warehouse/destinations/bigquery/config/batch`: batch
    buffers rows by size and age.
  - `web-batch` at `/flows/web/destinations/collect/config/batch`: The browser
    sends events in batches.
  - `rule-batch` at
    `/flows/web/destinations/collect/config/mapping/product/impression/batch`:
    Impressions get their own, bigger buffer.
  - `queue-backfill` at `/flows/web/destinations/gtm/config/queue`: queue
    backfills events from before the destination started, not a retry queue.
  - `destination-require` at `/flows/web/destinations/gtm/config/require`:
    require starts GTM only after the consent decision.
  - `meta-capi` at `/flows/server/destinations/meta`: Meta Conversions API from
    the server for add to cart and purchase.
  - `datamanager` at `/flows/server/destinations/datamanager`: Google Ads
    conversions through the Data Manager API.
  - `warehouse-flow` at `/flows/warehouse`: A separate flow reads the topic into
    BigQuery; the warehouse keeps everything.
  - `pubsub-pull` at `/flows/warehouse/sources/pubsub`: The pull source reads
    the subscription and acks after the push.
  - `source-setup` at `/flows/warehouse/sources/pubsub/config/setup`: Source
    setup provisions the subscription with a dead letter topic.
  - `source-credentials` at
    `/flows/warehouse/sources/pubsub/config/credentials`: Sources take
    credentials too.
  - `bigquery` at `/flows/warehouse/destinations/bigquery`: Every event becomes
    one BigQuery row.
- **`queue` is backfill, not retry:** on `gtm`, events from before the consent
  decision are delivered once `require` is met.
- **`dlqMax`** bounds the dead letter queue of events that failed; `breaker`
  pauses a failing destination; `timeout` bounds each push.
- **The warehouse keeps everything:** bots, impressions and contract violations
  land in BigQuery; filtering is a vendor decision.
- **CLI:** Pub/Sub and BigQuery on their mocks, then provisioning (needs GCP,
  not run for this guide):

```bash
walkeros push packages/cli/examples/flow-complete.json -f server -e events/order-complete.json --simulate destination.pubsub
walkeros push packages/cli/examples/flow-complete.json -f warehouse -e '{"name":"page view","data":{"title":"Home"},"source":{"type":"express"}}' --simulate destination.bigquery
walkeros setup destination.pubsub -c packages/cli/examples/flow-complete.json -f server
```

- Output: `call PubSub.topic.publishMessage(...)` with the event, and
  `call JSONWriter.appendRows(...)` with one row.
- **MCP:** `flow_simulate`, `package_get` (`@walkeros/server-destination-gcp`).
- **In GTM:** a server container with a BigQuery or Pub/Sub custom tag.
- **Docs:** `getting-started/flow/index`.

## build-run: Build and run

- **Purpose:** turn the file into artifacts: one `walker.js`, one server
  artifact per server flow.
- **Features:**
  - `bundle-packages` at `/flows/server/config/bundle/packages`: bundle.packages
    lists what a flow is built from.
  - `package-version` at
    `/flows/server/config/bundle/packages/@walkeros~1collector/version`: Pinned
    versions keep builds reproducible; validate --strict warns without them.
  - `root-include` at `/include`: include ships the shared folder, walker.js
    included, with the server artifact.
- `--release` stamps the id on every event as `source.release`; there is no
  release variable in the file.
- Root `include` ships `shared/` (with `walker.js`) next to every artifact.
- **CLI:**

```bash
walkeros bundle packages/cli/examples/flow-complete.json -f web --stats
walkeros bundle packages/cli/examples/flow-complete.json --all -o dist/all
walkeros bundle packages/cli/examples/flow-complete.json -f server -o dist/server.mjs --release 2026-09-26
runneros start dist/server.mjs -p 8080 --env-file .env
walkeros cache info
```

- `--all` needs `-o`: it writes `dist/all/web/walker.js`,
  `dist/all/server/flow.mjs` and `dist/all/warehouse/flow.mjs`.
- `runneros` (`@walkeros/runner`) runs a prebuilt artifact; the same artifact
  runs in Docker.
- **MCP:** `flow_bundle`.
- **In GTM:** publishing a container version.
- **Docs:** `getting-started/flow/index`.

## operate: Observe, CI and deploy

- **Purpose:** watch live events, gate changes in CI, deploy through the app.
- **Features:**
  - `observe-public` at `/flows/web/config/observe`: A web flow reports to
    Observe through a public url and binding.
  - `observe-level` at `/flows/server/config/observe/level`: level standard
    reports step outcomes; trace adds payloads.
  - `observe-sample` at `/flows/server/config/observe/sample`: sample reports
    one event in ten.
  - `collector-logger` at `/flows/server/collector/logger`: The log level comes
    from the flow variable, so LOG_LEVEL changes it per environment.
- **CI:** `walkeros validate packages/cli/examples/flow-complete.json --strict`
  plus the step examples as fixtures.
- **CLI (app-bound, need a login; listed, not run for this guide):**

```bash
walkeros flows create flow-complete -c packages/cli/examples/flow-complete.json
walkeros deploy create packages/cli/examples/flow-complete.json
walkeros deploy start <flowId>
walkeros observe start <flowId>
```

- **MCP:** `flow_manage`, `deploy_manage`, `observe_session`, `flow_validate`
  then `flow_simulate` then `flow_push` as the agent loop.
- **In GTM:** preview mode and container versions.
- **Docs:** `collector/logger`.
