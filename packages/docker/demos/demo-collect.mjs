// node_modules/@walkeros/core/dist/index.mjs
import { z as f } from "zod";
var e = Object.defineProperty;
var n = (n5, t3) => {
  for (var i2 in t3)
    e(n5, i2, { get: t3[i2], enumerable: true });
};
function h(e5, n5, t3 = "draft-7") {
  return f.toJSONSchema(e5, { target: t3 });
}
var v = f.string();
var S = f.number();
var w = f.boolean();
var k = f.string().min(1);
var j = f.number().int().positive();
var x = f.number().int().nonnegative();
var E = f.number().describe("Tagging version number");
var P = f.union([f.string(), f.number(), f.boolean()]);
var C = P.optional();
var O = {};
n(O, { ErrorHandlerSchema: () => J, HandlerSchema: () => M, LogHandlerSchema: () => L, StorageSchema: () => I, StorageTypeSchema: () => D, errorHandlerJsonSchema: () => A, handlerJsonSchema: () => q, logHandlerJsonSchema: () => N, storageJsonSchema: () => z, storageTypeJsonSchema: () => R });
var D = f.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
var I = f.object({ Local: f.literal("local"), Session: f.literal("session"), Cookie: f.literal("cookie") }).describe("Storage type constants for type-safe references");
var J = f.any().describe("Error handler function: (error, state?) => void");
var L = f.any().describe("Log handler function: (message, verbose?) => void");
var M = f.object({ Error: J.describe("Error handler function"), Log: L.describe("Log handler function") }).describe("Handler interface with error and log functions");
var R = h(D);
var z = h(I);
var A = h(J);
var N = h(L);
var q = h(M);
var T = f.object({ onError: J.optional().describe("Error handler function: (error, state?) => void"), onLog: L.optional().describe("Log handler function: (message, verbose?) => void") }).partial();
var U = f.object({ verbose: f.boolean().describe("Enable verbose logging for debugging").optional() }).partial();
var W = f.object({ queue: f.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial();
var B = f.object({}).partial();
var $ = f.object({ init: f.boolean().describe("Whether to initialize immediately").optional(), loadScript: f.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial();
var V = f.object({ disabled: f.boolean().describe("Set to true to disable").optional() }).partial();
var H = f.object({ primary: f.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial();
var _ = f.object({ settings: f.any().optional().describe("Implementation-specific configuration") }).partial();
var K = f.object({ env: f.any().optional().describe("Environment dependencies (platform-specific)") }).partial();
var Y = f.object({ type: f.string().optional().describe("Instance type identifier"), config: f.unknown().describe("Instance configuration") }).partial();
var Z = f.object({ collector: f.unknown().describe("Collector instance (runtime object)"), config: f.unknown().describe("Configuration"), env: f.unknown().describe("Environment dependencies") }).partial();
var ee = f.object({ batch: f.number().optional().describe("Batch size: bundle N events for batch processing"), batched: f.unknown().optional().describe("Batch of events to be processed") }).partial();
var ne = f.object({ ignore: f.boolean().describe("Set to true to skip processing").optional(), condition: f.string().optional().describe("Condition function: return true to process") }).partial();
var te = f.object({ sources: f.record(f.string(), f.unknown()).describe("Map of source instances") }).partial();
var ie = f.object({ destinations: f.record(f.string(), f.unknown()).describe("Map of destination instances") }).partial();
var oe = {};
n(oe, { ConsentSchema: () => ue, DeepPartialEventSchema: () => ve, EntitiesSchema: () => fe, EntitySchema: () => ge, EventSchema: () => he, OrderedPropertiesSchema: () => le, PartialEventSchema: () => ye, PropertiesSchema: () => ce, PropertySchema: () => ae, PropertyTypeSchema: () => se, SourceSchema: () => be, SourceTypeSchema: () => de, UserSchema: () => pe, VersionSchema: () => me, consentJsonSchema: () => Ce, entityJsonSchema: () => Ee, eventJsonSchema: () => Se, orderedPropertiesJsonSchema: () => xe, partialEventJsonSchema: () => we, propertiesJsonSchema: () => je, sourceTypeJsonSchema: () => Pe, userJsonSchema: () => ke });
var re;
var se = f.lazy(() => f.union([f.boolean(), f.string(), f.number(), f.record(f.string(), ae)]));
var ae = f.lazy(() => f.union([se, f.array(se)]));
var ce = f.record(f.string(), ae.optional()).describe("Flexible property collection with optional values");
var le = f.record(f.string(), f.tuple([ae, f.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
var de = f.union([f.enum(["web", "server", "app", "other"]), f.string()]).describe("Source type: web, server, app, other, or custom");
var ue = f.record(f.string(), f.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
var pe = ce.and(f.object({ id: f.string().optional().describe("User identifier"), device: f.string().optional().describe("Device identifier"), session: f.string().optional().describe("Session identifier"), hash: f.string().optional().describe("Hashed identifier"), address: f.string().optional().describe("User address"), email: f.string().email().optional().describe("User email address"), phone: f.string().optional().describe("User phone number"), userAgent: f.string().optional().describe("Browser user agent string"), browser: f.string().optional().describe("Browser name"), browserVersion: f.string().optional().describe("Browser version"), deviceType: f.string().optional().describe("Device type (mobile, desktop, tablet)"), os: f.string().optional().describe("Operating system"), osVersion: f.string().optional().describe("Operating system version"), screenSize: f.string().optional().describe("Screen dimensions"), language: f.string().optional().describe("User language"), country: f.string().optional().describe("User country"), region: f.string().optional().describe("User region/state"), city: f.string().optional().describe("User city"), zip: f.string().optional().describe("User postal code"), timezone: f.string().optional().describe("User timezone"), ip: f.string().optional().describe("User IP address"), internal: f.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
var me = ce.and(f.object({ source: v.describe('Walker implementation version (e.g., "2.0.0")'), tagging: E })).describe("Walker version information");
var be = ce.and(f.object({ type: de.describe("Source type identifier"), id: v.describe("Source identifier (typically URL on web)"), previous_id: v.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
var ge = f.lazy(() => f.object({ entity: f.string().describe("Entity name"), data: ce.describe("Entity-specific properties"), nested: f.array(ge).describe("Nested child entities"), context: le.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
var fe = f.array(ge).describe("Array of nested entities");
var he = f.object({ name: f.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: ce.describe("Event-specific properties"), context: le.describe("Ordered context properties with priorities"), globals: ce.describe("Global properties shared across events"), custom: ce.describe("Custom implementation-specific properties"), user: pe.describe("User identification and attributes"), nested: fe.describe("Related nested entities"), consent: ue.describe("Consent states at event time"), id: k.describe("Unique event identifier (timestamp-based)"), trigger: v.describe("Event trigger identifier"), entity: v.describe("Parsed entity from event name"), action: v.describe("Parsed action from event name"), timestamp: j.describe("Unix timestamp in milliseconds since epoch"), timing: S.describe("Event processing timing information"), group: v.describe("Event grouping identifier"), count: x.describe("Event count in session"), version: me.describe("Walker version information"), source: be.describe("Event source information") }).describe("Complete walkerOS event structure");
var ye = he.partial().describe("Partial event structure with all fields optional");
var ve = he.partial().describe("Partial event structure with all top-level fields optional");
var Se = h(he);
var we = h(ye);
var ke = h(pe);
var je = h(ce);
var xe = h(le);
var Ee = h(ge);
var Pe = h(de);
var Ce = h(ue);
var Oe = {};
n(Oe, { ConfigSchema: () => qe, LoopSchema: () => Je, MapSchema: () => Me, PolicySchema: () => ze, ResultSchema: () => Te, RuleSchema: () => Ae, RulesSchema: () => Ne, SetSchema: () => Le, ValueConfigSchema: () => Re, ValueSchema: () => De, ValuesSchema: () => Ie, configJsonSchema: () => Fe, loopJsonSchema: () => Be, mapJsonSchema: () => Ve, policyJsonSchema: () => He, ruleJsonSchema: () => _e, rulesJsonSchema: () => Ke, setJsonSchema: () => $e, valueConfigJsonSchema: () => We, valueJsonSchema: () => Ue });
var De = f.lazy(() => f.union([f.string().describe('String value or property path (e.g., "data.id")'), f.number().describe("Numeric value"), f.boolean().describe("Boolean value"), f.lazy(() => re), f.array(De).describe("Array of values")]));
var Ie = f.array(De).describe("Array of transformation values");
var Je = f.lazy(() => f.tuple([De, De]).describe("Loop transformation: [source, transform] tuple for array processing"));
var Le = f.lazy(() => f.array(De).describe("Set: Array of values for selection or combination"));
var Me = f.lazy(() => f.record(f.string(), De).describe("Map: Object mapping keys to transformation values"));
var Re = re = f.object({ key: f.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: f.union([f.string(), f.number(), f.boolean()]).optional().describe("Static primitive value"), fn: f.string().optional().describe("Custom transformation function as string (serialized)"), map: Me.optional().describe("Object mapping: transform event data to structured output"), loop: Je.optional().describe("Loop transformation: [source, transform] for array processing"), set: Le.optional().describe("Set of values: combine or select from multiple values"), consent: ue.optional().describe("Required consent states to include this value"), condition: f.string().optional().describe("Condition function as string: return true to include value"), validate: f.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e5) => Object.keys(e5).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
var ze = f.record(f.string(), De).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
var Ae = f.object({ batch: f.number().optional().describe("Batch size: bundle N events for batch processing"), condition: f.string().optional().describe("Condition function as string: return true to process event"), consent: ue.optional().describe("Required consent states to process this event"), settings: f.any().optional().describe("Destination-specific settings for this event mapping"), data: f.union([De, Ie]).optional().describe("Data transformation rules for event"), ignore: f.boolean().optional().describe("Set to true to skip processing this event"), name: f.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: ze.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
var Ne = f.record(f.string(), f.record(f.string(), f.union([Ae, f.array(Ae)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
var qe = f.object({ consent: ue.optional().describe("Required consent states to process any events"), data: f.union([De, Ie]).optional().describe("Global data transformation applied to all events"), mapping: Ne.optional().describe("Entity-action specific mapping rules"), policy: ze.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
var Te = f.object({ eventMapping: Ae.optional().describe("Resolved mapping rule for event"), mappingKey: f.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
var Ue = h(De);
var We = h(Re);
var Be = h(Je);
var $e = h(Le);
var Ve = h(Me);
var He = h(ze);
var _e = h(Ae);
var Ke = h(Ne);
var Fe = h(qe);
var Ge = {};
n(Ge, { BatchSchema: () => rn, ConfigSchema: () => Qe, ContextSchema: () => Ze, DLQSchema: () => bn, DataSchema: () => sn, DestinationPolicySchema: () => Ye, DestinationsSchema: () => dn, InitDestinationsSchema: () => ln, InitSchema: () => cn, InstanceSchema: () => an, PartialConfigSchema: () => Xe, PushBatchContextSchema: () => nn, PushContextSchema: () => en, PushEventSchema: () => tn, PushEventsSchema: () => on, PushResultSchema: () => pn, RefSchema: () => un, ResultSchema: () => mn, batchJsonSchema: () => vn, configJsonSchema: () => gn, contextJsonSchema: () => hn, instanceJsonSchema: () => Sn, partialConfigJsonSchema: () => fn, pushContextJsonSchema: () => yn, resultJsonSchema: () => wn });
var Qe = f.object({ consent: ue.optional().describe("Required consent states to send events to this destination"), settings: f.any().describe("Implementation-specific configuration").optional(), data: f.union([De, Ie]).optional().describe("Global data transformation applied to all events for this destination"), env: f.any().describe("Environment dependencies (platform-specific)").optional(), id: k.describe("Destination instance identifier (defaults to destination key)").optional(), init: f.boolean().describe("Whether to initialize immediately").optional(), loadScript: f.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: Ne.optional().describe("Entity-action specific mapping rules for this destination"), policy: ze.optional().describe("Pre-processing policy rules applied before event mapping"), queue: f.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: f.boolean().describe("Enable verbose logging for debugging").optional(), onError: J.optional(), onLog: L.optional() }).describe("Destination configuration");
var Xe = Qe.partial().describe("Partial destination configuration with all fields optional");
var Ye = ze.describe("Destination policy rules for event pre-processing");
var Ze = f.object({ collector: f.unknown().describe("Collector instance (runtime object)"), config: Qe.describe("Destination configuration"), data: f.union([f.unknown(), f.array(f.unknown())]).optional().describe("Transformed event data"), env: f.unknown().describe("Environment dependencies") }).describe("Destination context for init and push functions");
var en = Ze.extend({ mapping: Ae.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
var nn = en.describe("Batch push context with event-specific mapping");
var tn = f.object({ event: he.describe("The event to process"), mapping: Ae.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
var on = f.array(tn).describe("Array of events with mappings");
var rn = f.object({ key: f.string().describe('Batch key (usually mapping key like "product.view")'), events: f.array(he).describe("Array of events in batch"), data: f.array(f.union([f.unknown(), f.array(f.unknown())]).optional()).describe("Transformed data for each event"), mapping: Ae.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
var sn = f.union([f.unknown(), f.array(f.unknown())]).optional().describe("Transformed event data (Property, undefined, or array)");
var an = f.object({ config: Qe.describe("Destination configuration"), queue: f.array(he).optional().describe("Queued events awaiting consent"), dlq: f.array(f.tuple([he, f.unknown()])).optional().describe("Dead letter queue (failed events with errors)"), type: f.string().optional().describe("Destination type identifier"), env: f.unknown().optional().describe("Environment dependencies"), init: f.unknown().optional().describe("Initialization function"), push: f.unknown().describe("Push function for single events"), pushBatch: f.unknown().optional().describe("Batch push function"), on: f.unknown().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
var cn = f.object({ code: an.describe("Destination instance with implementation"), config: Xe.optional().describe("Partial configuration overrides"), env: f.unknown().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
var ln = f.record(f.string(), cn).describe("Map of destination IDs to initialization configurations");
var dn = f.record(f.string(), an).describe("Map of destination IDs to runtime instances");
var un = f.object({ id: f.string().describe("Destination ID"), destination: an.describe("Destination instance") }).describe("Destination reference (ID + instance)");
var pn = f.object({ queue: f.array(he).optional().describe("Events queued (awaiting consent)"), error: f.unknown().optional().describe("Error if push failed") }).describe("Push operation result");
var mn = f.object({ successful: f.array(un).describe("Destinations that processed successfully"), queued: f.array(un).describe("Destinations that queued events"), failed: f.array(un).describe("Destinations that failed to process") }).describe("Overall destination processing result");
var bn = f.array(f.tuple([he, f.unknown()])).describe("Dead letter queue: [(event, error), ...]");
var gn = h(Qe);
var fn = h(Xe);
var hn = h(Ze);
var yn = h(en);
var vn = h(rn);
var Sn = h(an);
var wn = h(mn);
var kn = {};
n(kn, { CommandTypeSchema: () => jn, ConfigSchema: () => xn, DestinationsSchema: () => Dn, InitConfigSchema: () => Pn, InstanceSchema: () => In, PushContextSchema: () => Cn, SessionDataSchema: () => En, SourcesSchema: () => On, commandTypeJsonSchema: () => Jn, configJsonSchema: () => Ln, initConfigJsonSchema: () => Rn, instanceJsonSchema: () => An, pushContextJsonSchema: () => zn, sessionDataJsonSchema: () => Mn });
var jn = f.union([f.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), f.string()]).describe("Collector command type: standard commands or custom string for extensions");
var xn = f.object({ run: f.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: E, globalsStatic: ce.describe("Static global properties that persist across collector runs"), sessionStatic: f.record(f.string(), f.unknown()).describe("Static session data that persists across collector runs"), verbose: f.boolean().describe("Enable verbose logging for debugging"), onError: J.optional(), onLog: L.optional() }).describe("Core collector configuration");
var En = ce.and(f.object({ isStart: f.boolean().describe("Whether this is a new session start"), storage: f.boolean().describe("Whether storage is available"), id: k.describe("Session identifier").optional(), start: j.describe("Session start timestamp").optional(), marketing: f.literal(true).optional().describe("Marketing attribution flag"), updated: j.describe("Last update timestamp").optional(), isNew: f.boolean().describe("Whether this is a new session").optional(), device: k.describe("Device identifier").optional(), count: x.describe("Event count in session").optional(), runs: x.describe("Number of runs").optional() })).describe("Session state and tracking data");
var Pn = xn.partial().extend({ consent: ue.optional().describe("Initial consent state"), user: pe.optional().describe("Initial user data"), globals: ce.optional().describe("Initial global properties"), sources: f.unknown().optional().describe("Source configurations"), destinations: f.unknown().optional().describe("Destination configurations"), custom: ce.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
var Cn = f.object({ mapping: qe.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
var On = f.record(f.string(), f.unknown()).describe("Map of source IDs to source instances");
var Dn = f.record(f.string(), f.unknown()).describe("Map of destination IDs to destination instances");
var In = f.object({ push: f.unknown().describe("Push function for processing events"), command: f.unknown().describe("Command function for walker commands"), allowed: f.boolean().describe("Whether event processing is allowed"), config: xn.describe("Current collector configuration"), consent: ue.describe("Current consent state"), count: f.number().describe("Event count (increments with each event)"), custom: ce.describe("Custom implementation-specific properties"), sources: On.describe("Registered source instances"), destinations: Dn.describe("Registered destination instances"), globals: ce.describe("Current global properties"), group: f.string().describe("Event grouping identifier"), hooks: f.unknown().describe("Lifecycle hook functions"), on: f.unknown().describe("Event lifecycle configuration"), queue: f.array(he).describe("Queued events awaiting processing"), round: f.number().describe("Collector run count (increments with each run)"), session: f.union([En]).describe("Current session state"), timing: f.number().describe("Event processing timing information"), user: pe.describe("Current user data"), version: f.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
var Jn = h(jn);
var Ln = h(xn);
var Mn = h(En);
var Rn = h(Pn);
var zn = h(Cn);
var An = h(In);
var Nn = {};
n(Nn, { BaseEnvSchema: () => qn, ConfigSchema: () => Tn, InitSchema: () => Bn, InitSourceSchema: () => $n, InitSourcesSchema: () => Vn, InstanceSchema: () => Wn, PartialConfigSchema: () => Un, baseEnvJsonSchema: () => Hn, configJsonSchema: () => _n, initSourceJsonSchema: () => Gn, initSourcesJsonSchema: () => Qn, instanceJsonSchema: () => Fn, partialConfigJsonSchema: () => Kn });
var qn = f.object({ push: f.unknown().describe("Collector push function"), command: f.unknown().describe("Collector command function"), sources: f.unknown().optional().describe("Map of registered source instances"), elb: f.unknown().describe("Public API function (alias for collector.push)") }).catchall(f.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
var Tn = qe.extend({ settings: f.any().describe("Implementation-specific configuration").optional(), env: qn.optional().describe("Environment dependencies (platform-specific)"), id: k.describe("Source identifier (defaults to source key)").optional(), onError: J.optional(), disabled: f.boolean().describe("Set to true to disable").optional(), primary: f.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
var Un = Tn.partial().describe("Partial source configuration with all fields optional");
var Wn = f.object({ type: f.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: Tn.describe("Current source configuration"), push: f.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: f.any().optional().describe("Cleanup function called when source is removed"), on: f.unknown().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
var Bn = f.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
var $n = f.object({ code: Bn.describe("Source initialization function"), config: Un.optional().describe("Partial configuration overrides"), env: qn.partial().optional().describe("Partial environment overrides"), primary: f.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
var Vn = f.record(f.string(), $n).describe("Map of source IDs to initialization configurations");
var Hn = h(qn);
var _n = h(Tn);
var Kn = h(Un);
var Fn = h(Wn);
var Gn = h($n);
var Qn = h(Vn);
var Xn = {};
n(Xn, { ConfigSchema: () => nt, DestinationReferenceSchema: () => et, PrimitiveSchema: () => Yn, SetupSchema: () => tt, SourceReferenceSchema: () => Zn, configJsonSchema: () => ct, destinationReferenceJsonSchema: () => dt, parseConfig: () => rt, parseSetup: () => it, safeParseConfig: () => st, safeParseSetup: () => ot, setupJsonSchema: () => at, sourceReferenceJsonSchema: () => lt });
var Yn = f.union([f.string(), f.number(), f.boolean()]).describe("Primitive value: string, number, or boolean");
var Zn = f.object({ package: f.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")'), config: f.unknown().optional().describe("Source-specific configuration object"), env: f.unknown().optional().describe("Source environment configuration"), primary: f.boolean().optional().describe("Mark as primary source (provides main elb). Only one source should be primary.") }).describe("Source package reference with configuration");
var et = f.object({ package: f.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")'), config: f.unknown().optional().describe("Destination-specific configuration object"), env: f.unknown().optional().describe("Destination environment configuration") }).describe("Destination package reference with configuration");
var nt = f.object({ platform: f.enum(["web", "server"], { error: 'Platform must be "web" or "server"' }).describe('Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection'), sources: f.record(f.string(), Zn).optional().describe("Source configurations (data capture) keyed by unique identifier"), destinations: f.record(f.string(), et).optional().describe("Destination configurations (data output) keyed by unique identifier"), collector: f.unknown().optional().describe("Collector configuration for event processing (uses Collector.InitConfig)"), env: f.record(f.string(), f.string()).optional().describe("Environment-specific variables (override root-level variables)") }).passthrough().describe("Single environment configuration for one deployment target");
var tt = f.object({ version: f.literal(1, { error: "Only version 1 is currently supported" }).describe("Configuration schema version (currently only 1 is supported)"), $schema: f.string().url("Schema URL must be a valid URL").optional().describe('JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")'), variables: f.record(f.string(), Yn).optional().describe("Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)"), definitions: f.record(f.string(), f.unknown()).optional().describe("Reusable configuration definitions (reference with JSON Schema $ref syntax)"), environments: f.record(f.string(), nt).refine((e5) => Object.keys(e5).length > 0, { message: "At least one environment is required" }).describe("Named environment configurations (e.g., web_prod, server_stage)") }).describe("Complete multi-environment walkerOS configuration (walkeros.config.json)");
function it(e5) {
  return tt.parse(e5);
}
function ot(e5) {
  return tt.safeParse(e5);
}
function rt(e5) {
  return nt.parse(e5);
}
function st(e5) {
  return nt.safeParse(e5);
}
var at = f.toJSONSchema(tt, { target: "draft-7" });
var ct = h(nt);
var lt = h(Zn);
var dt = h(et);
var yt = { merge: true, shallow: true, extend: true };
function vt(e5, n5 = {}, t3 = {}) {
  t3 = { ...yt, ...t3 };
  const i2 = Object.entries(n5).reduce((n6, [i3, o3]) => {
    const r2 = e5[i3];
    return t3.merge && Array.isArray(r2) && Array.isArray(o3) ? n6[i3] = o3.reduce((e6, n7) => e6.includes(n7) ? e6 : [...e6, n7], [...r2]) : (t3.extend || i3 in e5) && (n6[i3] = o3), n6;
  }, {});
  return t3.shallow ? { ...e5, ...i2 } : (Object.assign(e5, i2), e5);
}
function wt(e5) {
  return Array.isArray(e5);
}
function kt(e5) {
  return "boolean" == typeof e5;
}
function xt(e5) {
  return void 0 !== e5;
}
function Pt(e5) {
  return "function" == typeof e5;
}
function Ct(e5) {
  return "number" == typeof e5 && !Number.isNaN(e5);
}
function Ot(e5) {
  return "object" == typeof e5 && null !== e5 && !wt(e5) && "[object Object]" === Object.prototype.toString.call(e5);
}
function It(e5) {
  return "string" == typeof e5;
}
function Jt(e5, n5 = /* @__PURE__ */ new WeakMap()) {
  if ("object" != typeof e5 || null === e5)
    return e5;
  if (n5.has(e5))
    return n5.get(e5);
  const t3 = Object.prototype.toString.call(e5);
  if ("[object Object]" === t3) {
    const t4 = {};
    n5.set(e5, t4);
    for (const i2 in e5)
      Object.prototype.hasOwnProperty.call(e5, i2) && (t4[i2] = Jt(e5[i2], n5));
    return t4;
  }
  if ("[object Array]" === t3) {
    const t4 = [];
    return n5.set(e5, t4), e5.forEach((e6) => {
      t4.push(Jt(e6, n5));
    }), t4;
  }
  if ("[object Date]" === t3)
    return new Date(e5.getTime());
  if ("[object RegExp]" === t3) {
    const n6 = e5;
    return new RegExp(n6.source, n6.flags);
  }
  return e5;
}
function Lt(e5, n5 = "", t3) {
  const i2 = n5.split(".");
  let o3 = e5;
  for (let e6 = 0; e6 < i2.length; e6++) {
    const n6 = i2[e6];
    if ("*" === n6 && wt(o3)) {
      const n7 = i2.slice(e6 + 1).join("."), r2 = [];
      for (const e7 of o3) {
        const i3 = Lt(e7, n7, t3);
        r2.push(i3);
      }
      return r2;
    }
    if (o3 = o3 instanceof Object ? o3[n6] : void 0, !o3)
      break;
  }
  return xt(o3) ? o3 : t3;
}
function Mt(e5, n5, t3) {
  if (!Ot(e5))
    return e5;
  const i2 = Jt(e5), o3 = n5.split(".");
  let r2 = i2;
  for (let e6 = 0; e6 < o3.length; e6++) {
    const n6 = o3[e6];
    e6 === o3.length - 1 ? r2[n6] = t3 : (n6 in r2 && "object" == typeof r2[n6] && null !== r2[n6] || (r2[n6] = {}), r2 = r2[n6]);
  }
  return i2;
}
function Rt(e5) {
  if ("true" === e5)
    return true;
  if ("false" === e5)
    return false;
  const n5 = Number(e5);
  return e5 == n5 && "" !== e5 ? n5 : String(e5);
}
function zt(e5, n5 = {}, t3 = {}) {
  const i2 = { ...n5, ...t3 }, o3 = {};
  let r2 = void 0 === e5;
  return Object.keys(i2).forEach((n6) => {
    i2[n6] && (o3[n6] = true, e5 && e5[n6] && (r2 = true));
  }), !!r2 && o3;
}
function Tt(e5 = 6) {
  let n5 = "";
  for (let t3 = 36; n5.length < e5; )
    n5 += (Math.random() * t3 | 0).toString(t3);
  return n5;
}
function Wt(e5, n5 = 1e3, t3 = false) {
  let i2, o3 = null, r2 = false;
  return (...s3) => new Promise((a4) => {
    const c2 = t3 && !r2;
    o3 && clearTimeout(o3), o3 = setTimeout(() => {
      o3 = null, t3 && !r2 || (i2 = e5(...s3), a4(i2));
    }, n5), c2 && (r2 = true, i2 = e5(...s3), a4(i2));
  });
}
function $t(e5) {
  return kt(e5) || It(e5) || Ct(e5) || !xt(e5) || wt(e5) && e5.every($t) || Ot(e5) && Object.values(e5).every($t);
}
function Ht(e5) {
  return $t(e5) ? e5 : void 0;
}
function _t(e5, n5, t3) {
  return function(...i2) {
    try {
      return e5(...i2);
    } catch (e6) {
      if (!n5)
        return;
      return n5(e6);
    } finally {
      t3?.();
    }
  };
}
function Kt(e5, n5, t3) {
  return async function(...i2) {
    try {
      return await e5(...i2);
    } catch (e6) {
      if (!n5)
        return;
      return await n5(e6);
    } finally {
      await t3?.();
    }
  };
}
async function Ft(e5, n5) {
  const [t3, i2] = (e5.name || "").split(" ");
  if (!n5 || !t3 || !i2)
    return {};
  let o3, r2 = "", s3 = t3, a4 = i2;
  const c2 = (n6) => {
    if (n6)
      return (n6 = wt(n6) ? n6 : [n6]).find((n7) => !n7.condition || n7.condition(e5));
  };
  n5[s3] || (s3 = "*");
  const l3 = n5[s3];
  return l3 && (l3[a4] || (a4 = "*"), o3 = c2(l3[a4])), o3 || (s3 = "*", a4 = "*", o3 = c2(n5[s3]?.[a4])), o3 && (r2 = `${s3} ${a4}`), { eventMapping: o3, mappingKey: r2 };
}
async function Gt(e5, n5 = {}, t3 = {}) {
  if (!xt(e5))
    return;
  const i2 = Ot(e5) && e5.consent || t3.consent || t3.collector?.consent, o3 = wt(n5) ? n5 : [n5];
  for (const n6 of o3) {
    const o4 = await Kt(Qt)(e5, n6, { ...t3, consent: i2 });
    if (xt(o4))
      return o4;
  }
}
async function Qt(e5, n5, t3 = {}) {
  const { collector: i2, consent: o3 } = t3;
  return (wt(n5) ? n5 : [n5]).reduce(async (n6, r2) => {
    const s3 = await n6;
    if (s3)
      return s3;
    const a4 = It(r2) ? { key: r2 } : r2;
    if (!Object.keys(a4).length)
      return;
    const { condition: c2, consent: l3, fn: d2, key: u, loop: p2, map: m, set: b, validate: g2, value: f2 } = a4;
    if (c2 && !await Kt(c2)(e5, r2, i2))
      return;
    if (l3 && !zt(l3, o3))
      return f2;
    let h3 = xt(f2) ? f2 : e5;
    if (d2 && (h3 = await Kt(d2)(e5, r2, t3)), u && (h3 = Lt(e5, u, f2)), p2) {
      const [n7, i3] = p2, o4 = "this" === n7 ? [e5] : await Gt(e5, n7, t3);
      wt(o4) && (h3 = (await Promise.all(o4.map((e6) => Gt(e6, i3, t3)))).filter(xt));
    } else
      m ? h3 = await Object.entries(m).reduce(async (n7, [i3, o4]) => {
        const r3 = await n7, s4 = await Gt(e5, o4, t3);
        return xt(s4) && (r3[i3] = s4), r3;
      }, Promise.resolve({})) : b && (h3 = await Promise.all(b.map((n7) => Qt(e5, n7, t3))));
    g2 && !await Kt(g2)(h3) && (h3 = void 0);
    const y2 = Ht(h3);
    return xt(y2) ? y2 : Ht(f2);
  }, Promise.resolve(void 0));
}
async function Xt(e5, n5, t3) {
  n5.policy && await Promise.all(Object.entries(n5.policy).map(async ([n6, i3]) => {
    const o4 = await Gt(e5, i3, { collector: t3 });
    e5 = Mt(e5, n6, o4);
  }));
  const { eventMapping: i2, mappingKey: o3 } = await Ft(e5, n5.mapping);
  i2?.policy && await Promise.all(Object.entries(i2.policy).map(async ([n6, i3]) => {
    const o4 = await Gt(e5, i3, { collector: t3 });
    e5 = Mt(e5, n6, o4);
  }));
  let r2 = n5.data && await Gt(e5, n5.data, { collector: t3 });
  if (i2) {
    if (i2.ignore)
      return { event: e5, data: r2, mapping: i2, mappingKey: o3, ignore: true };
    if (i2.name && (e5.name = i2.name), i2.data) {
      const n6 = i2.data && await Gt(e5, i2.data, { collector: t3 });
      r2 = Ot(r2) && Ot(n6) ? vt(r2, n6) : n6;
    }
  }
  return { event: e5, data: r2, mapping: i2, mappingKey: o3, ignore: false };
}
function ei(e5, n5 = false) {
  n5 && console.dir(e5, { depth: 4 });
}
function ni(e5) {
  const n5 = String(e5), t3 = n5.split("?")[1] || n5;
  return _t(() => {
    const e6 = new URLSearchParams(t3), n6 = {};
    return e6.forEach((e7, t4) => {
      const i2 = t4.split(/[[\]]+/).filter(Boolean);
      let o3 = n6;
      i2.forEach((n7, t5) => {
        const r2 = t5 === i2.length - 1;
        if (wt(o3)) {
          const s3 = parseInt(n7, 10);
          r2 ? o3[s3] = Rt(e7) : (o3[s3] = o3[s3] || (isNaN(parseInt(i2[t5 + 1], 10)) ? {} : []), o3 = o3[s3]);
        } else
          Ot(o3) && (r2 ? o3[n7] = Rt(e7) : (o3[n7] = o3[n7] || (isNaN(parseInt(i2[t5 + 1], 10)) ? {} : []), o3 = o3[n7]));
      });
    }), n6;
  })();
}
function ai(e5, n5, t3) {
  return function(...i2) {
    let o3;
    const r2 = "post" + n5, s3 = t3["pre" + n5], a4 = t3[r2];
    return o3 = s3 ? s3({ fn: e5 }, ...i2) : e5(...i2), a4 && (o3 = a4({ fn: e5, result: o3 }, ...i2)), o3;
  };
}

// node_modules/@walkeros/collector/dist/index.mjs
var e2 = Object.defineProperty;
var n2 = { Action: "action", Actions: "actions", Config: "config", Consent: "consent", Context: "context", Custom: "custom", Destination: "destination", Elb: "elb", Globals: "globals", Hook: "hook", Init: "init", Link: "link", On: "on", Prefix: "data-elb", Ready: "ready", Run: "run", Session: "session", User: "user", Walker: "walker" };
var o = { Commands: n2, Utils: { Storage: { Cookie: "cookie", Local: "local", Session: "session" } } };
var t = {};
((n5, o3) => {
  for (var t3 in o3)
    e2(n5, t3, { get: o3[t3], enumerable: true });
})(t, { schemas: () => a, settingsSchema: () => s });
var s = { type: "object", properties: { run: { type: "boolean", description: "Automatically start the collector pipeline on initialization" }, sources: { type: "object", description: "Configurations for sources providing events to the collector" }, destinations: { type: "object", description: "Configurations for destinations receiving processed events" }, consent: { type: "object", description: "Initial consent state to control routing of events" }, verbose: { type: "boolean", description: "Enable verbose logging for debugging" }, onError: { type: "string", description: "Error handler triggered when the collector encounters failures" }, onLog: { type: "string", description: "Custom log handler for collector messages" } } };
var a = { settings: s };
async function h2(e5, n5, o3) {
  const { code: t3, config: s3 = {}, env: a4 = {} } = n5, i2 = o3 || s3 || { init: false }, c2 = { ...t3, config: i2, env: q2(t3.env, a4) };
  let r2 = c2.config.id;
  if (!r2)
    do {
      r2 = Tt(4);
    } while (e5.destinations[r2]);
  return e5.destinations[r2] = c2, false !== c2.config.queue && (c2.queue = [...e5.queue]), y(e5, void 0, { [r2]: c2 });
}
async function y(e5, n5, o3) {
  const { allowed: t3, consent: s3, globals: a4, user: i2 } = e5;
  if (!t3)
    return w2({ ok: false });
  n5 && e5.queue.push(n5), o3 || (o3 = e5.destinations);
  const u = await Promise.all(Object.entries(o3 || {}).map(async ([o4, t4]) => {
    let u2 = (t4.queue || []).map((e6) => ({ ...e6, consent: s3 }));
    if (t4.queue = [], n5) {
      const e6 = Jt(n5);
      u2.push(e6);
    }
    if (!u2.length)
      return { id: o4, destination: t4, skipped: true };
    const l4 = [], m2 = u2.filter((e6) => {
      const n6 = zt(t4.config.consent, s3, e6.consent);
      return !n6 || (e6.consent = n6, l4.push(e6), false);
    });
    if (t4.queue.concat(m2), !l4.length)
      return { id: o4, destination: t4, queue: u2 };
    if (!await Kt(v2)(e5, t4))
      return { id: o4, destination: t4, queue: u2 };
    let f3 = false;
    return t4.dlq || (t4.dlq = []), await Promise.all(l4.map(async (n6) => (n6.globals = vt(a4, n6.globals), n6.user = vt(i2, n6.user), await Kt(k2, (o5) => (e5.config.onError && e5.config.onError(o5, e5), f3 = true, t4.dlq.push([n6, o5]), false))(e5, t4, n6), n6))), { id: o4, destination: t4, error: f3 };
  })), l3 = [], m = [], f2 = [];
  for (const e6 of u) {
    if (e6.skipped)
      continue;
    const n6 = e6.destination, o4 = { id: e6.id, destination: n6 };
    e6.error ? f2.push(o4) : e6.queue && e6.queue.length ? (n6.queue = (n6.queue || []).concat(e6.queue), m.push(o4)) : l3.push(o4);
  }
  return w2({ ok: !f2.length, event: n5, successful: l3, queued: m, failed: f2 });
}
async function v2(e5, n5) {
  if (n5.init && !n5.config.init) {
    const o3 = { collector: e5, config: n5.config, env: q2(n5.env, n5.config.env) }, t3 = await ai(n5.init, "DestinationInit", e5.hooks)(o3);
    if (false === t3)
      return t3;
    n5.config = { ...t3 || n5.config, init: true };
  }
  return true;
}
async function k2(e5, n5, o3) {
  const { config: t3 } = n5, s3 = await Xt(o3, t3, e5);
  if (s3.ignore)
    return false;
  const a4 = { collector: e5, config: t3, data: s3.data, mapping: s3.mapping, env: q2(n5.env, t3.env) }, i2 = s3.mapping;
  if (i2?.batch && n5.pushBatch) {
    const o4 = i2.batched || { key: s3.mappingKey || "", events: [], data: [] };
    o4.events.push(s3.event), xt(s3.data) && o4.data.push(s3.data), i2.batchFn = i2.batchFn || Wt((e6, n6) => {
      const a5 = { collector: n6, config: t3, data: s3.data, mapping: i2, env: q2(e6.env, t3.env) };
      ai(e6.pushBatch, "DestinationPushBatch", n6.hooks)(o4, a5), o4.events = [], o4.data = [];
    }, i2.batch), i2.batched = o4, i2.batchFn?.(n5, e5);
  } else
    await ai(n5.push, "DestinationPush", e5.hooks)(s3.event, a4);
  return true;
}
function w2(e5) {
  return vt({ ok: !e5?.failed?.length, successful: [], queued: [], failed: [] }, e5);
}
async function C2(e5, n5 = {}) {
  const o3 = {};
  for (const [e6, t3] of Object.entries(n5)) {
    const { code: n6, config: s3 = {}, env: a4 = {} } = t3, i2 = { ...n6.config, ...s3 }, c2 = q2(n6.env, a4);
    o3[e6] = { ...n6, config: i2, env: c2 };
  }
  return o3;
}
function q2(e5, n5) {
  return e5 || n5 ? n5 ? e5 && Ot(e5) && Ot(n5) ? { ...e5, ...n5 } : n5 : e5 : {};
}
function O2(e5, n5, o3) {
  const t3 = e5.on, s3 = t3[n5] || [], a4 = wt(o3) ? o3 : [o3];
  a4.forEach((e6) => {
    s3.push(e6);
  }), t3[n5] = s3, A2(e5, n5, a4);
}
function A2(e5, n5, t3, s3) {
  let a4, i2 = t3 || [];
  switch (t3 || (i2 = e5.on[n5] || []), n5) {
    case o.Commands.Consent:
      a4 = s3 || e5.consent;
      break;
    case o.Commands.Session:
      a4 = e5.session;
      break;
    case o.Commands.Ready:
    case o.Commands.Run:
    default:
      a4 = void 0;
  }
  if (Object.values(e5.sources).forEach((e6) => {
    e6.on && _t(e6.on)(n5, a4);
  }), Object.values(e5.destinations).forEach((e6) => {
    if (e6.on) {
      const o3 = e6.on;
      _t(o3)(n5, a4);
    }
  }), i2.length)
    switch (n5) {
      case o.Commands.Consent:
        !function(e6, n6, o3) {
          const t4 = o3 || e6.consent;
          n6.forEach((n7) => {
            Object.keys(t4).filter((e7) => e7 in n7).forEach((o4) => {
              _t(n7[o4])(e6, t4);
            });
          });
        }(e5, i2, s3);
        break;
      case o.Commands.Ready:
      case o.Commands.Run:
        !function(e6, n6) {
          e6.allowed && n6.forEach((n7) => {
            _t(n7)(e6);
          });
        }(e5, i2);
        break;
      case o.Commands.Session:
        !function(e6, n6) {
          if (!e6.session)
            return;
          n6.forEach((n7) => {
            _t(n7)(e6, e6.session);
          });
        }(e5, i2);
    }
}
async function S2(e5, n5) {
  const { consent: o3 } = e5;
  let t3 = false;
  const s3 = {};
  return Object.entries(n5).forEach(([e6, n6]) => {
    const o4 = !!n6;
    s3[e6] = o4, t3 = t3 || o4;
  }), e5.consent = vt(o3, s3), A2(e5, "consent", void 0, s3), t3 ? y(e5) : w2({ ok: true });
}
async function B2(e5, n5, t3, s3) {
  let a4;
  switch (n5) {
    case o.Commands.Config:
      Ot(t3) && vt(e5.config, t3, { shallow: false });
      break;
    case o.Commands.Consent:
      Ot(t3) && (a4 = await S2(e5, t3));
      break;
    case o.Commands.Custom:
      Ot(t3) && (e5.custom = vt(e5.custom, t3));
      break;
    case o.Commands.Destination:
      Ot(t3) && Pt(t3.push) && (a4 = await h2(e5, { code: t3 }, s3));
      break;
    case o.Commands.Globals:
      Ot(t3) && (e5.globals = vt(e5.globals, t3));
      break;
    case o.Commands.On:
      It(t3) && O2(e5, t3, s3);
      break;
    case o.Commands.Ready:
      A2(e5, "ready");
      break;
    case o.Commands.Run:
      a4 = await G(e5, t3);
      break;
    case o.Commands.Session:
      A2(e5, "session");
      break;
    case o.Commands.User:
      Ot(t3) && vt(e5.user, t3, { shallow: false });
  }
  return a4 || { ok: true, successful: [], queued: [], failed: [] };
}
function F(e5, n5) {
  if (!n5.name)
    throw new Error("Event name is required");
  const [o3, t3] = n5.name.split(" ");
  if (!o3 || !t3)
    throw new Error("Event name is invalid");
  ++e5.count;
  const { timestamp: s3 = Date.now(), group: a4 = e5.group, count: i2 = e5.count } = n5, { name: c2 = `${o3} ${t3}`, data: r2 = {}, context: u = {}, globals: l3 = e5.globals, custom: d2 = {}, user: m = e5.user, nested: f2 = [], consent: g2 = e5.consent, id: p2 = `${s3}-${a4}-${i2}`, trigger: b = "", entity: h3 = o3, action: y2 = t3, timing: v3 = 0, version: k3 = { source: e5.version, tagging: e5.config.tagging || 0 }, source: w3 = { type: "collector", id: "", previous_id: "" } } = n5;
  return { name: c2, data: r2, context: u, globals: l3, custom: d2, user: m, nested: f2, consent: g2, id: p2, trigger: b, entity: h3, action: y2, timestamp: s3, timing: v3, group: a4, count: i2, version: k3, source: w3 };
}
async function G(e5, n5) {
  e5.allowed = true, e5.count = 0, e5.group = Tt(), e5.timing = Date.now(), n5 && (n5.consent && (e5.consent = vt(e5.consent, n5.consent)), n5.user && (e5.user = vt(e5.user, n5.user)), n5.globals && (e5.globals = vt(e5.config.globalsStatic || {}, n5.globals)), n5.custom && (e5.custom = vt(e5.custom, n5.custom))), Object.values(e5.destinations).forEach((e6) => {
    e6.queue = [];
  }), e5.queue = [], e5.round++;
  const o3 = await y(e5);
  return A2(e5, "run"), o3;
}
function _2(e5, n5) {
  return ai(async (o3, t3 = {}) => await Kt(async () => {
    let s3 = o3;
    if (t3.mapping) {
      const n6 = await Xt(s3, t3.mapping, e5);
      if (n6.ignore)
        return w2({ ok: true });
      if (t3.mapping.consent) {
        if (!zt(t3.mapping.consent, e5.consent, n6.event.consent))
          return w2({ ok: true });
      }
      s3 = n6.event;
    }
    const a4 = n5(s3), i2 = F(e5, a4);
    return await y(e5, i2);
  }, () => w2({ ok: false }))(), "Push", e5.hooks);
}
async function J2(e5) {
  const n5 = vt({ globalsStatic: {}, sessionStatic: {}, tagging: 0, verbose: false, onLog: o3, run: true }, e5, { merge: false, extend: false });
  function o3(e6, o4) {
    ei({ message: e6 }, o4 || n5.verbose);
  }
  n5.onLog = o3;
  const t3 = { ...n5.globalsStatic, ...e5.globals }, s3 = { allowed: false, config: n5, consent: e5.consent || {}, count: 0, custom: e5.custom || {}, destinations: {}, globals: t3, group: "", hooks: {}, on: {}, queue: [], round: 0, session: void 0, timing: Date.now(), user: e5.user || {}, version: "0.3.1", sources: {}, push: void 0, command: void 0 };
  return s3.push = _2(s3, (e6) => ({ timing: Math.round((Date.now() - s3.timing) / 10) / 100, source: { type: "collector", id: "", previous_id: "" }, ...e6 })), s3.command = function(e6, n6) {
    return ai(async (o4, t4, s4) => await Kt(async () => await n6(e6, o4, t4, s4), () => w2({ ok: false }))(), "Command", e6.hooks);
  }(s3, B2), s3.destinations = await C2(0, e5.destinations || {}), s3;
}
async function Q(e5, n5 = {}) {
  const o3 = {};
  for (const [t3, s3] of Object.entries(n5)) {
    const { code: n6, config: a4 = {}, env: i2 = {}, primary: c2 } = s3, r2 = { push: (n7, o4 = {}) => e5.push(n7, { ...o4, mapping: a4 }), command: e5.command, sources: e5.sources, elb: e5.sources.elb.push, ...i2 }, u = await Kt(n6)(a4, r2);
    u && (c2 && (u.config = { ...u.config, primary: c2 }), o3[t3] = u);
  }
  return o3;
}
async function T2(e5) {
  e5 = e5 || {};
  const n5 = await J2(e5), o3 = (t3 = n5, { type: "elb", config: {}, push: async (e6, n6, o4, s4, a5, i3) => {
    if ("string" == typeof e6 && e6.startsWith("walker ")) {
      const s5 = e6.replace("walker ", "");
      return t3.command(s5, n6, o4);
    }
    let c3;
    if ("string" == typeof e6)
      c3 = { name: e6 }, n6 && "object" == typeof n6 && !Array.isArray(n6) && (c3.data = n6);
    else {
      if (!e6 || "object" != typeof e6)
        return { ok: false, successful: [], queued: [], failed: [] };
      c3 = e6, n6 && "object" == typeof n6 && !Array.isArray(n6) && (c3.data = { ...c3.data || {}, ...n6 });
    }
    return s4 && "object" == typeof s4 && (c3.context = s4), a5 && Array.isArray(a5) && (c3.nested = a5), i3 && "object" == typeof i3 && (c3.custom = i3), t3.push(c3);
  } });
  var t3;
  n5.sources.elb = o3;
  const s3 = await Q(n5, e5.sources || {});
  Object.assign(n5.sources, s3);
  const { consent: a4, user: i2, globals: c2, custom: r2 } = e5;
  a4 && await n5.command("consent", a4), i2 && await n5.command("user", i2), c2 && Object.assign(n5.globals, c2), r2 && Object.assign(n5.custom, r2), n5.config.run && await n5.command("run");
  let u = o3.push;
  const l3 = Object.values(n5.sources).filter((e6) => "elb" !== e6.type), d2 = l3.find((e6) => e6.config.primary);
  return d2 ? u = d2.push : l3.length > 0 && (u = l3[0].push), { collector: n5, elb: u };
}

// node_modules/@walkeros/server-source-express/dist/index.mjs
import e3 from "express";
import o2 from "cors";
var r = f.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
var n3 = f.union([f.string(), f.array(f.string()), f.literal("*")]);
var a2 = f.object({ origin: n3.describe("Allowed origins (* for all, URL string, or array of URLs)").optional(), methods: f.array(r).describe("Allowed HTTP methods").optional(), headers: f.array(f.string()).describe("Allowed request headers").optional(), credentials: f.boolean().describe("Allow credentials (cookies, authorization headers)").optional(), maxAge: f.number().int().positive().describe("Preflight cache duration in seconds").optional() });
var l = f.object({ port: f.number().int().min(0).max(65535).describe("HTTP server port to listen on. Use 0 for random available port. If not provided, server will not start (app only mode)").optional(), path: f.string().describe("Event collection endpoint path").default("/collect"), cors: f.union([f.boolean(), a2]).describe("CORS configuration: false = disabled, true = allow all origins (default), object = custom configuration").default(true), status: f.boolean().describe("Enable health check endpoints (/health, /ready)").default(true) });
function c(e5, o3 = true) {
  if (false !== o3)
    if (true === o3)
      e5.set("Access-Control-Allow-Origin", "*"), e5.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS"), e5.set("Access-Control-Allow-Headers", "Content-Type");
    else {
      if (o3.origin) {
        const s3 = Array.isArray(o3.origin) ? o3.origin.join(", ") : o3.origin;
        e5.set("Access-Control-Allow-Origin", s3);
      }
      o3.methods && e5.set("Access-Control-Allow-Methods", o3.methods.join(", ")), o3.headers && e5.set("Access-Control-Allow-Headers", o3.headers.join(", ")), o3.credentials && e5.set("Access-Control-Allow-Credentials", "true"), o3.maxAge && e5.set("Access-Control-Max-Age", String(o3.maxAge));
    }
}
var d = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
var p = async (t3, r2) => {
  const n5 = l.parse(t3.settings || {}), a4 = e3();
  if (a4.use(e3.json({ limit: "1mb" })), false !== n5.cors) {
    const e5 = true === n5.cors ? {} : n5.cors;
    a4.use(o2(e5));
  }
  const i2 = async (e5, o3) => {
    try {
      if ("OPTIONS" === e5.method)
        return c(o3, n5.cors), void o3.status(204).send();
      if ("GET" === e5.method) {
        const t4 = ni(e5.url);
        return t4 && "object" == typeof t4 && await r2.push(t4), o3.set("Content-Type", "image/gif"), o3.set("Cache-Control", "no-cache, no-store, must-revalidate"), void o3.send(d);
      }
      if ("POST" === e5.method) {
        const s3 = e5.body;
        return s3 && "object" == typeof s3 ? (await r2.push(s3), void o3.json({ success: true, timestamp: Date.now() })) : void o3.status(400).json({ success: false, error: "Invalid event: body must be an object" });
      }
      o3.status(405).json({ success: false, error: "Method not allowed. Use POST, GET, or OPTIONS." });
    } catch (e6) {
      o3.status(500).json({ success: false, error: e6 instanceof Error ? e6.message : "Internal server error" });
    }
  };
  let p2;
  if (a4.post(n5.path, i2), a4.get(n5.path, i2), a4.options(n5.path, i2), n5.status && (a4.get("/health", (e5, o3) => {
    o3.json({ status: "ok", timestamp: Date.now(), source: "express" });
  }), a4.get("/ready", (e5, o3) => {
    o3.json({ status: "ready", timestamp: Date.now(), source: "express" });
  })), void 0 !== n5.port) {
    p2 = a4.listen(n5.port, () => {
      console.log(`\u2705 Express source listening on port ${n5.port}`), console.log(`   POST ${n5.path} - Event collection (JSON body)`), console.log(`   GET ${n5.path} - Pixel tracking (query params)`), console.log(`   OPTIONS ${n5.path} - CORS preflight`), n5.status && (console.log("   GET /health - Health check"), console.log("   GET /ready - Readiness check"));
    });
    const e5 = () => {
      p2 && p2.close();
    };
    process.on("SIGTERM", e5), process.on("SIGINT", e5);
  }
  return { type: "express", config: { ...t3, settings: n5 }, push: i2, app: a4, server: p2 };
};

// node_modules/@walkeros/destination-demo/dist/index.mjs
var e4 = Object.defineProperty;
var n4 = (n5, o3) => {
  for (var i2 in o3)
    e4(n5, i2, { get: o3[i2], enumerable: true });
};
var i = {};
n4(i, { env: () => t2 });
var t2 = {};
n4(t2, { init: () => s2, push: () => a3, simulation: () => l2 });
var s2 = { log: void 0 };
var a3 = { log: Object.assign(() => {
}, {}) };
var l2 = ["call:log"];
var g = { type: "demo", config: { settings: { name: "demo" } }, init({ config: e5, env: n5 }) {
  (n5?.log || console.log)(`[${{ name: "demo", ...e5?.settings }.name}] initialized`);
}, push(e5, { config: n5, env: o3 }) {
  const i2 = o3?.log || console.log, t3 = { name: "demo", ...n5?.settings }, s3 = t3.values ? function(e6, n6) {
    const o4 = {};
    for (const i3 of n6) {
      const n7 = i3.split(".").reduce((e7, n8) => e7?.[n8], e6);
      void 0 !== n7 && (o4[i3] = n7);
    }
    return o4;
  }(e5, t3.values) : e5;
  i2(`[${t3.name}] ${JSON.stringify(s3, null, 2)}`);
} };

// entry.js
async function entry_default(context = {}) {
  const { tracker } = context;
  const __simulationTracker = tracker;
  const window = typeof globalThis.window !== "undefined" ? globalThis.window : void 0;
  const document2 = typeof globalThis.document !== "undefined" ? globalThis.document : void 0;
  const config = {
    sources: {
      http: {
        code: p,
        config: {
          settings: {
            path: "/collect",
            port: 8080,
            cors: true,
            healthCheck: true
          }
        }
      }
    },
    destinations: {
      demo: {
        code: g,
        config: {
          settings: {
            name: "Server Collection Demo",
            values: [
              "name",
              "data",
              "context",
              "user",
              "nested",
              "timestamp"
            ]
          }
        }
      }
    },
    ...{
      run: true,
      globals: {
        environment: "test",
        version: "1.0.0"
      }
    }
  };
  const result = await T2(config);
  return result;
}
export {
  entry_default as default
};
