// node_modules/@walkeros/core/dist/index.mjs
import { z as f } from "zod";
import { z as k } from "zod";
import { z } from "zod";
import { zodToJsonSchema as D } from "zod-to-json-schema";
import { z as ae } from "zod";
import { zodToJsonSchema as se } from "zod-to-json-schema";
import { z as Ie } from "zod";
import { zodToJsonSchema as Oe } from "zod-to-json-schema";
import { z as et } from "zod";
import { zodToJsonSchema as tt } from "zod-to-json-schema";
import { z as zt } from "zod";
import { zodToJsonSchema as Dt } from "zod-to-json-schema";
import { z as Ht } from "zod";
import { zodToJsonSchema as _t } from "zod-to-json-schema";
import { z as un } from "zod";
import { zodToJsonSchema as mn } from "zod-to-json-schema";
import { zodToJsonSchema as gn } from "zod-to-json-schema";
var e = Object.defineProperty;
var t = (t4, n4) => {
  for (var i2 in n4)
    e(t4, i2, { get: n4[i2], enumerable: true });
};
var h = f.string();
var y = f.number();
var S = f.boolean();
var v = f.string().min(1);
var j = f.number().int().positive();
var w = f.number().int().nonnegative();
var x = f.number().describe("Tagging version number");
var E = f.union([f.string(), f.number(), f.boolean()]);
var C = E.optional();
var P = {};
t(P, { ErrorHandlerSchema: () => O, HandlerSchema: () => L, LogHandlerSchema: () => J, StorageSchema: () => I, StorageTypeSchema: () => $, errorHandlerJsonSchema: () => R, handlerJsonSchema: () => q, logHandlerJsonSchema: () => A, storageJsonSchema: () => M, storageTypeJsonSchema: () => T });
var $ = z.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
var I = z.object({ Local: z.literal("local"), Session: z.literal("session"), Cookie: z.literal("cookie") }).describe("Storage type constants for type-safe references");
var O = z.any().describe("Error handler function: (error, state?) => void");
var J = z.any().describe("Log handler function: (message, verbose?) => void");
var L = z.object({ Error: O.describe("Error handler function"), Log: J.describe("Log handler function") }).describe("Handler interface with error and log functions");
var T = D($, { target: "jsonSchema7", $refStrategy: "relative", name: "StorageType" });
var M = D(I, { target: "jsonSchema7", $refStrategy: "relative", name: "Storage" });
var R = D(O, { target: "jsonSchema7", $refStrategy: "relative", name: "ErrorHandler" });
var A = D(J, { target: "jsonSchema7", $refStrategy: "relative", name: "LogHandler" });
var q = D(L, { target: "jsonSchema7", $refStrategy: "relative", name: "Handler" });
var U = k.object({ onError: O.optional().describe("Error handler function: (error, state?) => void"), onLog: J.optional().describe("Log handler function: (message, verbose?) => void") }).partial();
var N = k.object({ verbose: k.boolean().describe("Enable verbose logging for debugging").optional() }).partial();
var B = k.object({ queue: k.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial();
var W = k.object({}).partial();
var V = k.object({ init: k.boolean().describe("Whether to initialize immediately").optional(), loadScript: k.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial();
var H = k.object({ disabled: k.boolean().describe("Set to true to disable").optional() }).partial();
var _ = k.object({ primary: k.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial();
var K = k.object({ settings: k.any().optional().describe("Implementation-specific configuration") }).partial();
var F = k.object({ env: k.any().optional().describe("Environment dependencies (platform-specific)") }).partial();
var Z = k.object({ type: k.string().optional().describe("Instance type identifier"), config: k.any().describe("Instance configuration") }).partial();
var ee = k.object({ collector: k.any().describe("Collector instance (runtime object)"), config: k.any().describe("Configuration"), env: k.any().describe("Environment dependencies") }).partial();
var te = k.object({ batch: k.number().optional().describe("Batch size: bundle N events for batch processing"), batched: k.any().optional().describe("Batch of events to be processed") }).partial();
var ne = k.object({ ignore: k.boolean().describe("Set to true to skip processing").optional(), condition: k.string().optional().describe("Condition function: return true to process") }).partial();
var ie = k.object({ sources: k.record(k.string(), k.any()).describe("Map of source instances") }).partial();
var oe = k.object({ destinations: k.record(k.string(), k.any()).describe("Map of destination instances") }).partial();
var re = {};
t(re, { ConsentSchema: () => me, DeepPartialEventSchema: () => je, EntitiesSchema: () => ye, EntitySchema: () => he, EventSchema: () => Se, OrderedPropertiesSchema: () => pe, PartialEventSchema: () => ve, PropertiesSchema: () => de, PropertySchema: () => le, PropertyTypeSchema: () => ce, SourceSchema: () => fe, SourceTypeSchema: () => ue, UserSchema: () => ge, VersionSchema: () => be, consentJsonSchema: () => De, entityJsonSchema: () => Pe, eventJsonSchema: () => we, orderedPropertiesJsonSchema: () => ke, partialEventJsonSchema: () => xe, propertiesJsonSchema: () => Ce, sourceTypeJsonSchema: () => ze, userJsonSchema: () => Ee });
var ce = ae.lazy(() => ae.union([ae.boolean(), ae.string(), ae.number(), ae.record(ae.string(), le)]));
var le = ae.lazy(() => ae.union([ce, ae.array(ce)]));
var de = ae.record(ae.string(), le.optional()).describe("Flexible property collection with optional values");
var pe = ae.record(ae.string(), ae.tuple([le, ae.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
var ue = ae.union([ae.enum(["web", "server", "app", "other"]), ae.string()]).describe("Source type: web, server, app, other, or custom");
var me = ae.record(ae.string(), ae.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
var ge = de.and(ae.object({ id: ae.string().optional().describe("User identifier"), device: ae.string().optional().describe("Device identifier"), session: ae.string().optional().describe("Session identifier"), hash: ae.string().optional().describe("Hashed identifier"), address: ae.string().optional().describe("User address"), email: ae.string().email().optional().describe("User email address"), phone: ae.string().optional().describe("User phone number"), userAgent: ae.string().optional().describe("Browser user agent string"), browser: ae.string().optional().describe("Browser name"), browserVersion: ae.string().optional().describe("Browser version"), deviceType: ae.string().optional().describe("Device type (mobile, desktop, tablet)"), os: ae.string().optional().describe("Operating system"), osVersion: ae.string().optional().describe("Operating system version"), screenSize: ae.string().optional().describe("Screen dimensions"), language: ae.string().optional().describe("User language"), country: ae.string().optional().describe("User country"), region: ae.string().optional().describe("User region/state"), city: ae.string().optional().describe("User city"), zip: ae.string().optional().describe("User postal code"), timezone: ae.string().optional().describe("User timezone"), ip: ae.string().optional().describe("User IP address"), internal: ae.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
var be = de.and(ae.object({ source: h.describe('Walker implementation version (e.g., "2.0.0")'), tagging: x })).describe("Walker version information");
var fe = de.and(ae.object({ type: ue.describe("Source type identifier"), id: h.describe("Source identifier (typically URL on web)"), previous_id: h.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
var he = ae.lazy(() => ae.object({ entity: ae.string().describe("Entity name"), data: de.describe("Entity-specific properties"), nested: ae.array(he).describe("Nested child entities"), context: pe.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
var ye = ae.array(he).describe("Array of nested entities");
var Se = ae.object({ name: ae.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: de.describe("Event-specific properties"), context: pe.describe("Ordered context properties with priorities"), globals: de.describe("Global properties shared across events"), custom: de.describe("Custom implementation-specific properties"), user: ge.describe("User identification and attributes"), nested: ye.describe("Related nested entities"), consent: me.describe("Consent states at event time"), id: v.describe("Unique event identifier (timestamp-based)"), trigger: h.describe("Event trigger identifier"), entity: h.describe("Parsed entity from event name"), action: h.describe("Parsed action from event name"), timestamp: j.describe("Unix timestamp in milliseconds since epoch"), timing: y.describe("Event processing timing information"), group: h.describe("Event grouping identifier"), count: w.describe("Event count in session"), version: be.describe("Walker version information"), source: fe.describe("Event source information") }).describe("Complete walkerOS event structure");
var ve = Se.partial().describe("Partial event structure with all fields optional");
var je = ae.lazy(() => Se.deepPartial()).describe("Deep partial event structure with all nested fields optional");
var we = se(Se, { target: "jsonSchema7", $refStrategy: "relative", name: "Event" });
var xe = se(ve, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialEvent" });
var Ee = se(ge, { target: "jsonSchema7", $refStrategy: "relative", name: "User" });
var Ce = se(de, { target: "jsonSchema7", $refStrategy: "relative", name: "Properties" });
var ke = se(pe, { target: "jsonSchema7", $refStrategy: "relative", name: "OrderedProperties" });
var Pe = se(he, { target: "jsonSchema7", $refStrategy: "relative", name: "Entity" });
var ze = se(ue, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceType" });
var De = se(me, { target: "jsonSchema7", $refStrategy: "relative", name: "Consent" });
var $e = {};
t($e, { ConfigSchema: () => Be, LoopSchema: () => Te, MapSchema: () => Re, PolicySchema: () => qe, ResultSchema: () => We, RuleSchema: () => Ue, RulesSchema: () => Ne, SetSchema: () => Me, ValueConfigSchema: () => Ae, ValueSchema: () => Je, ValuesSchema: () => Le, configJsonSchema: () => Ye, loopJsonSchema: () => _e, mapJsonSchema: () => Fe, policyJsonSchema: () => Ge, ruleJsonSchema: () => Qe, rulesJsonSchema: () => Xe, setJsonSchema: () => Ke, valueConfigJsonSchema: () => He, valueJsonSchema: () => Ve });
var Je = Ie.lazy(() => Ie.union([Ie.string().describe('String value or property path (e.g., "data.id")'), Ie.number().describe("Numeric value"), Ie.boolean().describe("Boolean value"), Ae, Ie.array(Je).describe("Array of values")]));
var Le = Ie.array(Je).describe("Array of transformation values");
var Te = Ie.tuple([Je, Je]).describe("Loop transformation: [source, transform] tuple for array processing");
var Me = Ie.array(Je).describe("Set: Array of values for selection or combination");
var Re = Ie.record(Ie.string(), Je).describe("Map: Object mapping keys to transformation values");
var Ae = Ie.object({ key: Ie.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: Ie.union([Ie.string(), Ie.number(), Ie.boolean()]).optional().describe("Static primitive value"), fn: Ie.string().optional().describe("Custom transformation function as string (serialized)"), map: Re.optional().describe("Object mapping: transform event data to structured output"), loop: Te.optional().describe("Loop transformation: [source, transform] for array processing"), set: Me.optional().describe("Set of values: combine or select from multiple values"), consent: me.optional().describe("Required consent states to include this value"), condition: Ie.string().optional().describe("Condition function as string: return true to include value"), validate: Ie.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e5) => Object.keys(e5).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
var qe = Ie.record(Ie.string(), Je).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
var Ue = Ie.object({ batch: Ie.number().optional().describe("Batch size: bundle N events for batch processing"), condition: Ie.string().optional().describe("Condition function as string: return true to process event"), consent: me.optional().describe("Required consent states to process this event"), settings: Ie.any().optional().describe("Destination-specific settings for this event mapping"), data: Ie.union([Je, Le]).optional().describe("Data transformation rules for event"), ignore: Ie.boolean().optional().describe("Set to true to skip processing this event"), name: Ie.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: qe.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
var Ne = Ie.record(Ie.string(), Ie.record(Ie.string(), Ie.union([Ue, Ie.array(Ue)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
var Be = Ie.object({ consent: me.optional().describe("Required consent states to process any events"), data: Ie.union([Je, Le]).optional().describe("Global data transformation applied to all events"), mapping: Ne.optional().describe("Entity-action specific mapping rules"), policy: qe.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
var We = Ie.object({ eventMapping: Ue.optional().describe("Resolved mapping rule for event"), mappingKey: Ie.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
var Ve = Oe(Je, { target: "jsonSchema7", $refStrategy: "relative", name: "Value" });
var He = Oe(Ae, { target: "jsonSchema7", $refStrategy: "relative", name: "ValueConfig" });
var _e = Oe(Te, { target: "jsonSchema7", $refStrategy: "relative", name: "Loop" });
var Ke = Oe(Me, { target: "jsonSchema7", $refStrategy: "relative", name: "Set" });
var Fe = Oe(Re, { target: "jsonSchema7", $refStrategy: "relative", name: "Map" });
var Ge = Oe(qe, { target: "jsonSchema7", $refStrategy: "relative", name: "Policy" });
var Qe = Oe(Ue, { target: "jsonSchema7", $refStrategy: "relative", name: "Rule" });
var Xe = Oe(Ne, { target: "jsonSchema7", $refStrategy: "relative", name: "Rules" });
var Ye = Oe(Be, { target: "jsonSchema7", $refStrategy: "relative", name: "MappingConfig" });
var Ze = {};
t(Ze, { BatchSchema: () => dt, ConfigSchema: () => nt, ContextSchema: () => rt, DLQSchema: () => St, DataSchema: () => pt, DestinationPolicySchema: () => ot, DestinationsSchema: () => bt, InitDestinationsSchema: () => gt, InitSchema: () => mt, InstanceSchema: () => ut, PartialConfigSchema: () => it, PushBatchContextSchema: () => st, PushContextSchema: () => at, PushEventSchema: () => ct, PushEventsSchema: () => lt, PushResultSchema: () => ht, RefSchema: () => ft, ResultSchema: () => yt, batchJsonSchema: () => Et, configJsonSchema: () => vt, contextJsonSchema: () => wt, instanceJsonSchema: () => Ct, partialConfigJsonSchema: () => jt, pushContextJsonSchema: () => xt, resultJsonSchema: () => kt });
var nt = et.object({ consent: me.optional().describe("Required consent states to send events to this destination"), settings: et.any().describe("Implementation-specific configuration").optional(), data: et.union([Je, Le]).optional().describe("Global data transformation applied to all events for this destination"), env: et.any().describe("Environment dependencies (platform-specific)").optional(), id: v.describe("Destination instance identifier (defaults to destination key)").optional(), init: et.boolean().describe("Whether to initialize immediately").optional(), loadScript: et.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: Ne.optional().describe("Entity-action specific mapping rules for this destination"), policy: qe.optional().describe("Pre-processing policy rules applied before event mapping"), queue: et.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: et.boolean().describe("Enable verbose logging for debugging").optional(), onError: O.optional(), onLog: J.optional() }).describe("Destination configuration");
var it = nt.deepPartial().describe("Partial destination configuration with all fields deeply optional");
var ot = qe.describe("Destination policy rules for event pre-processing");
var rt = et.object({ collector: et.any().describe("Collector instance (runtime object)"), config: nt.describe("Destination configuration"), data: et.union([et.any(), et.undefined(), et.array(et.union([et.any(), et.undefined()]))]).optional().describe("Transformed event data"), env: et.any().describe("Environment dependencies") }).describe("Destination context for init and push functions");
var at = rt.extend({ mapping: Ue.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
var st = at.describe("Batch push context with event-specific mapping");
var ct = et.object({ event: Se.describe("The event to process"), mapping: Ue.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
var lt = et.array(ct).describe("Array of events with mappings");
var dt = et.object({ key: et.string().describe('Batch key (usually mapping key like "product.view")'), events: et.array(Se).describe("Array of events in batch"), data: et.array(et.union([et.any(), et.undefined(), et.array(et.union([et.any(), et.undefined()]))])).describe("Transformed data for each event"), mapping: Ue.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
var pt = et.union([et.any(), et.undefined(), et.array(et.union([et.any(), et.undefined()]))]).describe("Transformed event data (Property, undefined, or array)");
var ut = et.object({ config: nt.describe("Destination configuration"), queue: et.array(Se).optional().describe("Queued events awaiting consent"), dlq: et.array(et.tuple([Se, et.any()])).optional().describe("Dead letter queue (failed events with errors)"), type: et.string().optional().describe("Destination type identifier"), env: et.any().optional().describe("Environment dependencies"), init: et.any().optional().describe("Initialization function"), push: et.any().describe("Push function for single events"), pushBatch: et.any().optional().describe("Batch push function"), on: et.any().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
var mt = et.object({ code: ut.describe("Destination instance with implementation"), config: it.optional().describe("Partial configuration overrides"), env: et.any().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
var gt = et.record(et.string(), mt).describe("Map of destination IDs to initialization configurations");
var bt = et.record(et.string(), ut).describe("Map of destination IDs to runtime instances");
var ft = et.object({ id: et.string().describe("Destination ID"), destination: ut.describe("Destination instance") }).describe("Destination reference (ID + instance)");
var ht = et.object({ queue: et.array(Se).optional().describe("Events queued (awaiting consent)"), error: et.any().optional().describe("Error if push failed") }).describe("Push operation result");
var yt = et.object({ successful: et.array(ft).describe("Destinations that processed successfully"), queued: et.array(ft).describe("Destinations that queued events"), failed: et.array(ft).describe("Destinations that failed to process") }).describe("Overall destination processing result");
var St = et.array(et.tuple([Se, et.any()])).describe("Dead letter queue: [(event, error), ...]");
var vt = tt(nt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationConfig" });
var jt = tt(it, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialDestinationConfig" });
var wt = tt(rt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationContext" });
var xt = tt(at, { target: "jsonSchema7", $refStrategy: "relative", name: "PushContext" });
var Et = tt(dt, { target: "jsonSchema7", $refStrategy: "relative", name: "Batch" });
var Ct = tt(ut, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationInstance" });
var kt = tt(yt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationResult" });
var Pt = {};
t(Pt, { CommandTypeSchema: () => $t, ConfigSchema: () => It, DestinationsSchema: () => Mt, InitConfigSchema: () => Jt, InstanceSchema: () => Rt, PushContextSchema: () => Lt, SessionDataSchema: () => Ot, SourcesSchema: () => Tt, commandTypeJsonSchema: () => At, configJsonSchema: () => qt, initConfigJsonSchema: () => Nt, instanceJsonSchema: () => Wt, pushContextJsonSchema: () => Bt, sessionDataJsonSchema: () => Ut });
var $t = zt.union([zt.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), zt.string()]).describe("Collector command type: standard commands or custom string for extensions");
var It = zt.object({ run: zt.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: x, globalsStatic: de.describe("Static global properties that persist across collector runs"), sessionStatic: zt.record(zt.any()).describe("Static session data that persists across collector runs"), verbose: zt.boolean().describe("Enable verbose logging for debugging"), onError: O.optional(), onLog: J.optional() }).describe("Core collector configuration");
var Ot = de.and(zt.object({ isStart: zt.boolean().describe("Whether this is a new session start"), storage: zt.boolean().describe("Whether storage is available"), id: v.describe("Session identifier").optional(), start: j.describe("Session start timestamp").optional(), marketing: zt.literal(true).optional().describe("Marketing attribution flag"), updated: j.describe("Last update timestamp").optional(), isNew: zt.boolean().describe("Whether this is a new session").optional(), device: v.describe("Device identifier").optional(), count: w.describe("Event count in session").optional(), runs: w.describe("Number of runs").optional() })).describe("Session state and tracking data");
var Jt = It.partial().extend({ consent: me.optional().describe("Initial consent state"), user: ge.optional().describe("Initial user data"), globals: de.optional().describe("Initial global properties"), sources: zt.any().optional().describe("Source configurations"), destinations: zt.any().optional().describe("Destination configurations"), custom: de.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
var Lt = zt.object({ mapping: Be.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
var Tt = zt.record(zt.string(), zt.any()).describe("Map of source IDs to source instances");
var Mt = zt.record(zt.string(), zt.any()).describe("Map of destination IDs to destination instances");
var Rt = zt.object({ push: zt.any().describe("Push function for processing events"), command: zt.any().describe("Command function for walker commands"), allowed: zt.boolean().describe("Whether event processing is allowed"), config: It.describe("Current collector configuration"), consent: me.describe("Current consent state"), count: zt.number().describe("Event count (increments with each event)"), custom: de.describe("Custom implementation-specific properties"), sources: Tt.describe("Registered source instances"), destinations: Mt.describe("Registered destination instances"), globals: de.describe("Current global properties"), group: zt.string().describe("Event grouping identifier"), hooks: zt.any().describe("Lifecycle hook functions"), on: zt.any().describe("Event lifecycle configuration"), queue: zt.array(Se).describe("Queued events awaiting processing"), round: zt.number().describe("Collector run count (increments with each run)"), session: zt.union([zt.undefined(), Ot]).describe("Current session state"), timing: zt.number().describe("Event processing timing information"), user: ge.describe("Current user data"), version: zt.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
var At = Dt($t, { target: "jsonSchema7", $refStrategy: "relative", name: "CommandType" });
var qt = Dt(It, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorConfig" });
var Ut = Dt(Ot, { target: "jsonSchema7", $refStrategy: "relative", name: "SessionData" });
var Nt = Dt(Jt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitConfig" });
var Bt = Dt(Lt, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorPushContext" });
var Wt = Dt(Rt, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorInstance" });
var Vt = {};
t(Vt, { BaseEnvSchema: () => Kt, ConfigSchema: () => Ft, InitSchema: () => Xt, InitSourceSchema: () => Yt, InitSourcesSchema: () => Zt, InstanceSchema: () => Qt, PartialConfigSchema: () => Gt, baseEnvJsonSchema: () => en, configJsonSchema: () => tn, initSourceJsonSchema: () => rn, initSourcesJsonSchema: () => an, instanceJsonSchema: () => on, partialConfigJsonSchema: () => nn });
var Kt = Ht.object({ push: Ht.any().describe("Collector push function"), command: Ht.any().describe("Collector command function"), sources: Ht.any().optional().describe("Map of registered source instances"), elb: Ht.any().describe("Public API function (alias for collector.push)") }).catchall(Ht.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
var Ft = Be.extend({ settings: Ht.any().describe("Implementation-specific configuration").optional(), env: Kt.optional().describe("Environment dependencies (platform-specific)"), id: v.describe("Source identifier (defaults to source key)").optional(), onError: O.optional(), disabled: Ht.boolean().describe("Set to true to disable").optional(), primary: Ht.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
var Gt = Ft.deepPartial().describe("Partial source configuration with all fields deeply optional");
var Qt = Ht.object({ type: Ht.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: Ft.describe("Current source configuration"), push: Ht.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: Ht.any().optional().describe("Cleanup function called when source is removed"), on: Ht.any().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
var Xt = Ht.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
var Yt = Ht.object({ code: Xt.describe("Source initialization function"), config: Gt.optional().describe("Partial configuration overrides"), env: Kt.partial().optional().describe("Partial environment overrides"), primary: Ht.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
var Zt = Ht.record(Ht.string(), Yt).describe("Map of source IDs to initialization configurations");
var en = _t(Kt, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceBaseEnv" });
var tn = _t(Ft, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceConfig" });
var nn = _t(Gt, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialSourceConfig" });
var on = _t(Qt, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceInstance" });
var rn = _t(Yt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSource" });
var an = _t(Zt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSources" });
var hn = { merge: true, shallow: true, extend: true };
function yn(e5, t4 = {}, n4 = {}) {
  n4 = { ...hn, ...n4 };
  const i2 = Object.entries(t4).reduce((t5, [i3, o3]) => {
    const r2 = e5[i3];
    return n4.merge && Array.isArray(r2) && Array.isArray(o3) ? t5[i3] = o3.reduce((e6, t6) => e6.includes(t6) ? e6 : [...e6, t6], [...r2]) : (n4.extend || i3 in e5) && (t5[i3] = o3), t5;
  }, {});
  return n4.shallow ? { ...e5, ...i2 } : (Object.assign(e5, i2), e5);
}
function vn(e5) {
  return Array.isArray(e5);
}
function jn(e5) {
  return "boolean" == typeof e5;
}
function xn(e5) {
  return void 0 !== e5;
}
function Cn(e5) {
  return "function" == typeof e5;
}
function kn(e5) {
  return "number" == typeof e5 && !Number.isNaN(e5);
}
function Pn(e5) {
  return "object" == typeof e5 && null !== e5 && !vn(e5) && "[object Object]" === Object.prototype.toString.call(e5);
}
function Dn(e5) {
  return "string" == typeof e5;
}
function $n(e5, t4 = /* @__PURE__ */ new WeakMap()) {
  if ("object" != typeof e5 || null === e5)
    return e5;
  if (t4.has(e5))
    return t4.get(e5);
  const n4 = Object.prototype.toString.call(e5);
  if ("[object Object]" === n4) {
    const n5 = {};
    t4.set(e5, n5);
    for (const i2 in e5)
      Object.prototype.hasOwnProperty.call(e5, i2) && (n5[i2] = $n(e5[i2], t4));
    return n5;
  }
  if ("[object Array]" === n4) {
    const n5 = [];
    return t4.set(e5, n5), e5.forEach((e6) => {
      n5.push($n(e6, t4));
    }), n5;
  }
  if ("[object Date]" === n4)
    return new Date(e5.getTime());
  if ("[object RegExp]" === n4) {
    const t5 = e5;
    return new RegExp(t5.source, t5.flags);
  }
  return e5;
}
function In(e5, t4 = "", n4) {
  const i2 = t4.split(".");
  let o3 = e5;
  for (let e6 = 0; e6 < i2.length; e6++) {
    const t5 = i2[e6];
    if ("*" === t5 && vn(o3)) {
      const t6 = i2.slice(e6 + 1).join("."), r2 = [];
      for (const e7 of o3) {
        const i3 = In(e7, t6, n4);
        r2.push(i3);
      }
      return r2;
    }
    if (o3 = o3 instanceof Object ? o3[t5] : void 0, !o3)
      break;
  }
  return xn(o3) ? o3 : n4;
}
function On(e5, t4, n4) {
  if (!Pn(e5))
    return e5;
  const i2 = $n(e5), o3 = t4.split(".");
  let r2 = i2;
  for (let e6 = 0; e6 < o3.length; e6++) {
    const t5 = o3[e6];
    e6 === o3.length - 1 ? r2[t5] = n4 : (t5 in r2 && "object" == typeof r2[t5] && null !== r2[t5] || (r2[t5] = {}), r2 = r2[t5]);
  }
  return i2;
}
function Jn(e5) {
  if ("true" === e5)
    return true;
  if ("false" === e5)
    return false;
  const t4 = Number(e5);
  return e5 == t4 && "" !== e5 ? t4 : String(e5);
}
function Ln(e5, t4 = {}, n4 = {}) {
  const i2 = { ...t4, ...n4 }, o3 = {};
  let r2 = void 0 === e5;
  return Object.keys(i2).forEach((t5) => {
    i2[t5] && (o3[t5] = true, e5 && e5[t5] && (r2 = true));
  }), !!r2 && o3;
}
function An(e5 = 6) {
  let t4 = "";
  for (let n4 = 36; t4.length < e5; )
    t4 += (Math.random() * n4 | 0).toString(n4);
  return t4;
}
function Un(e5, t4 = 1e3, n4 = false) {
  let i2, o3 = null, r2 = false;
  return (...a4) => new Promise((s3) => {
    const c2 = n4 && !r2;
    o3 && clearTimeout(o3), o3 = setTimeout(() => {
      o3 = null, n4 && !r2 || (i2 = e5(...a4), s3(i2));
    }, t4), c2 && (r2 = true, i2 = e5(...a4), s3(i2));
  });
}
function Bn(e5) {
  return jn(e5) || Dn(e5) || kn(e5) || !xn(e5) || vn(e5) && e5.every(Bn) || Pn(e5) && Object.values(e5).every(Bn);
}
function Vn(e5) {
  return Bn(e5) ? e5 : void 0;
}
function Hn(e5, t4, n4) {
  return function(...i2) {
    try {
      return e5(...i2);
    } catch (e6) {
      if (!t4)
        return;
      return t4(e6);
    } finally {
      n4?.();
    }
  };
}
function _n(e5, t4, n4) {
  return async function(...i2) {
    try {
      return await e5(...i2);
    } catch (e6) {
      if (!t4)
        return;
      return await t4(e6);
    } finally {
      await n4?.();
    }
  };
}
async function Kn(e5, t4) {
  const [n4, i2] = (e5.name || "").split(" ");
  if (!t4 || !n4 || !i2)
    return {};
  let o3, r2 = "", a4 = n4, s3 = i2;
  const c2 = (t5) => {
    if (t5)
      return (t5 = vn(t5) ? t5 : [t5]).find((t6) => !t6.condition || t6.condition(e5));
  };
  t4[a4] || (a4 = "*");
  const l3 = t4[a4];
  return l3 && (l3[s3] || (s3 = "*"), o3 = c2(l3[s3])), o3 || (a4 = "*", s3 = "*", o3 = c2(t4[a4]?.[s3])), o3 && (r2 = `${a4} ${s3}`), { eventMapping: o3, mappingKey: r2 };
}
async function Fn(e5, t4 = {}, n4 = {}) {
  if (!xn(e5))
    return;
  const i2 = Pn(e5) && e5.consent || n4.consent || n4.collector?.consent, o3 = vn(t4) ? t4 : [t4];
  for (const t5 of o3) {
    const o4 = await _n(Gn)(e5, t5, { ...n4, consent: i2 });
    if (xn(o4))
      return o4;
  }
}
async function Gn(e5, t4, n4 = {}) {
  const { collector: i2, consent: o3 } = n4;
  return (vn(t4) ? t4 : [t4]).reduce(async (t5, r2) => {
    const a4 = await t5;
    if (a4)
      return a4;
    const s3 = Dn(r2) ? { key: r2 } : r2;
    if (!Object.keys(s3).length)
      return;
    const { condition: c2, consent: l3, fn: d2, key: p2, loop: u, map: m, set: g2, validate: b, value: f2 } = s3;
    if (c2 && !await _n(c2)(e5, r2, i2))
      return;
    if (l3 && !Ln(l3, o3))
      return f2;
    let h3 = xn(f2) ? f2 : e5;
    if (d2 && (h3 = await _n(d2)(e5, r2, n4)), p2 && (h3 = In(e5, p2, f2)), u) {
      const [t6, i3] = u, o4 = "this" === t6 ? [e5] : await Fn(e5, t6, n4);
      vn(o4) && (h3 = (await Promise.all(o4.map((e6) => Fn(e6, i3, n4)))).filter(xn));
    } else
      m ? h3 = await Object.entries(m).reduce(async (t6, [i3, o4]) => {
        const r3 = await t6, a5 = await Fn(e5, o4, n4);
        return xn(a5) && (r3[i3] = a5), r3;
      }, Promise.resolve({})) : g2 && (h3 = await Promise.all(g2.map((t6) => Gn(e5, t6, n4))));
    b && !await _n(b)(h3) && (h3 = void 0);
    const y3 = Vn(h3);
    return xn(y3) ? y3 : Vn(f2);
  }, Promise.resolve(void 0));
}
async function Qn(e5, t4, n4) {
  t4.policy && await Promise.all(Object.entries(t4.policy).map(async ([t5, i3]) => {
    const o4 = await Fn(e5, i3, { collector: n4 });
    e5 = On(e5, t5, o4);
  }));
  const { eventMapping: i2, mappingKey: o3 } = await Kn(e5, t4.mapping);
  i2?.policy && await Promise.all(Object.entries(i2.policy).map(async ([t5, i3]) => {
    const o4 = await Fn(e5, i3, { collector: n4 });
    e5 = On(e5, t5, o4);
  }));
  let r2 = t4.data && await Fn(e5, t4.data, { collector: n4 });
  if (i2) {
    if (i2.ignore)
      return { event: e5, data: r2, mapping: i2, mappingKey: o3, ignore: true };
    if (i2.name && (e5.name = i2.name), i2.data) {
      const t5 = i2.data && await Fn(e5, i2.data, { collector: n4 });
      r2 = Pn(r2) && Pn(t5) ? yn(r2, t5) : t5;
    }
  }
  return { event: e5, data: r2, mapping: i2, mappingKey: o3, ignore: false };
}
function Zn(e5, t4 = false) {
  t4 && console.dir(e5, { depth: 4 });
}
function ei(e5) {
  const t4 = String(e5), n4 = t4.split("?")[1] || t4;
  return Hn(() => {
    const e6 = new URLSearchParams(n4), t5 = {};
    return e6.forEach((e7, n5) => {
      const i2 = n5.split(/[[\]]+/).filter(Boolean);
      let o3 = t5;
      i2.forEach((t6, n6) => {
        const r2 = n6 === i2.length - 1;
        if (vn(o3)) {
          const a4 = parseInt(t6, 10);
          r2 ? o3[a4] = Jn(e7) : (o3[a4] = o3[a4] || (isNaN(parseInt(i2[n6 + 1], 10)) ? {} : []), o3 = o3[a4]);
        } else
          Pn(o3) && (r2 ? o3[t6] = Jn(e7) : (o3[t6] = o3[t6] || (isNaN(parseInt(i2[n6 + 1], 10)) ? {} : []), o3 = o3[t6]));
      });
    }), t5;
  })();
}
function ai(e5, t4, n4) {
  return function(...i2) {
    let o3;
    const r2 = "post" + t4, a4 = n4["pre" + t4], s3 = n4[r2];
    return o3 = a4 ? a4({ fn: e5 }, ...i2) : e5(...i2), s3 && (o3 = s3({ fn: e5, result: o3 }, ...i2)), o3;
  };
}

// node_modules/@walkeros/collector/dist/index.mjs
var e2 = Object.defineProperty;
var n = { Action: "action", Actions: "actions", Config: "config", Consent: "consent", Context: "context", Custom: "custom", Destination: "destination", Elb: "elb", Globals: "globals", Hook: "hook", Init: "init", Link: "link", On: "on", Prefix: "data-elb", Ready: "ready", Run: "run", Session: "session", User: "user", Walker: "walker" };
var o = { Commands: n, Utils: { Storage: { Cookie: "cookie", Local: "local", Session: "session" } } };
var t2 = {};
((n4, o3) => {
  for (var t4 in o3)
    e2(n4, t4, { get: o3[t4], enumerable: true });
})(t2, { schemas: () => a, settingsSchema: () => s });
var s = { type: "object", properties: { run: { type: "boolean", description: "Automatically start the collector pipeline on initialization" }, sources: { type: "object", description: "Configurations for sources providing events to the collector" }, destinations: { type: "object", description: "Configurations for destinations receiving processed events" }, consent: { type: "object", description: "Initial consent state to control routing of events" }, verbose: { type: "boolean", description: "Enable verbose logging for debugging" }, onError: { type: "string", description: "Error handler triggered when the collector encounters failures" }, onLog: { type: "string", description: "Custom log handler for collector messages" } } };
var a = { settings: s };
async function h2(e5, n4, o3) {
  const { code: t4, config: s3 = {}, env: a4 = {} } = n4, i2 = o3 || s3 || { init: false }, c2 = { ...t4, config: i2, env: q2(t4.env, a4) };
  let r2 = c2.config.id;
  if (!r2)
    do {
      r2 = An(4);
    } while (e5.destinations[r2]);
  return e5.destinations[r2] = c2, false !== c2.config.queue && (c2.queue = [...e5.queue]), y2(e5, void 0, { [r2]: c2 });
}
async function y2(e5, n4, o3) {
  const { allowed: t4, consent: s3, globals: a4, user: i2 } = e5;
  if (!t4)
    return w2({ ok: false });
  n4 && e5.queue.push(n4), o3 || (o3 = e5.destinations);
  const u = await Promise.all(Object.entries(o3 || {}).map(async ([o4, t5]) => {
    let u2 = (t5.queue || []).map((e6) => ({ ...e6, consent: s3 }));
    if (t5.queue = [], n4) {
      const e6 = $n(n4);
      u2.push(e6);
    }
    if (!u2.length)
      return { id: o4, destination: t5, skipped: true };
    const l4 = [], m2 = u2.filter((e6) => {
      const n5 = Ln(t5.config.consent, s3, e6.consent);
      return !n5 || (e6.consent = n5, l4.push(e6), false);
    });
    if (t5.queue.concat(m2), !l4.length)
      return { id: o4, destination: t5, queue: u2 };
    if (!await _n(v2)(e5, t5))
      return { id: o4, destination: t5, queue: u2 };
    let f3 = false;
    return t5.dlq || (t5.dlq = []), await Promise.all(l4.map(async (n5) => (n5.globals = yn(a4, n5.globals), n5.user = yn(i2, n5.user), await _n(k2, (o5) => (e5.config.onError && e5.config.onError(o5, e5), f3 = true, t5.dlq.push([n5, o5]), false))(e5, t5, n5), n5))), { id: o4, destination: t5, error: f3 };
  })), l3 = [], m = [], f2 = [];
  for (const e6 of u) {
    if (e6.skipped)
      continue;
    const n5 = e6.destination, o4 = { id: e6.id, destination: n5 };
    e6.error ? f2.push(o4) : e6.queue && e6.queue.length ? (n5.queue = (n5.queue || []).concat(e6.queue), m.push(o4)) : l3.push(o4);
  }
  return w2({ ok: !f2.length, event: n4, successful: l3, queued: m, failed: f2 });
}
async function v2(e5, n4) {
  if (n4.init && !n4.config.init) {
    const o3 = { collector: e5, config: n4.config, env: q2(n4.env, n4.config.env) }, t4 = await ai(n4.init, "DestinationInit", e5.hooks)(o3);
    if (false === t4)
      return t4;
    n4.config = { ...t4 || n4.config, init: true };
  }
  return true;
}
async function k2(e5, n4, o3) {
  const { config: t4 } = n4, s3 = await Qn(o3, t4, e5);
  if (s3.ignore)
    return false;
  const a4 = { collector: e5, config: t4, data: s3.data, mapping: s3.mapping, env: q2(n4.env, t4.env) }, i2 = s3.mapping;
  if (i2?.batch && n4.pushBatch) {
    const o4 = i2.batched || { key: s3.mappingKey || "", events: [], data: [] };
    o4.events.push(s3.event), xn(s3.data) && o4.data.push(s3.data), i2.batchFn = i2.batchFn || Un((e6, n5) => {
      const a5 = { collector: n5, config: t4, data: s3.data, mapping: i2, env: q2(e6.env, t4.env) };
      ai(e6.pushBatch, "DestinationPushBatch", n5.hooks)(o4, a5), o4.events = [], o4.data = [];
    }, i2.batch), i2.batched = o4, i2.batchFn?.(n4, e5);
  } else
    await ai(n4.push, "DestinationPush", e5.hooks)(s3.event, a4);
  return true;
}
function w2(e5) {
  return yn({ ok: !e5?.failed?.length, successful: [], queued: [], failed: [] }, e5);
}
async function C2(e5, n4 = {}) {
  const o3 = {};
  for (const [e6, t4] of Object.entries(n4)) {
    const { code: n5, config: s3 = {}, env: a4 = {} } = t4, i2 = { ...n5.config, ...s3 }, c2 = q2(n5.env, a4);
    o3[e6] = { ...n5, config: i2, env: c2 };
  }
  return o3;
}
function q2(e5, n4) {
  return e5 || n4 ? n4 ? e5 && Pn(e5) && Pn(n4) ? { ...e5, ...n4 } : n4 : e5 : {};
}
function O2(e5, n4, o3) {
  const t4 = e5.on, s3 = t4[n4] || [], a4 = vn(o3) ? o3 : [o3];
  a4.forEach((e6) => {
    s3.push(e6);
  }), t4[n4] = s3, A2(e5, n4, a4);
}
function A2(e5, n4, t4, s3) {
  let a4, i2 = t4 || [];
  switch (t4 || (i2 = e5.on[n4] || []), n4) {
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
    e6.on && Hn(e6.on)(n4, a4);
  }), Object.values(e5.destinations).forEach((e6) => {
    if (e6.on) {
      const o3 = e6.on;
      Hn(o3)(n4, a4);
    }
  }), i2.length)
    switch (n4) {
      case o.Commands.Consent:
        !function(e6, n5, o3) {
          const t5 = o3 || e6.consent;
          n5.forEach((n6) => {
            Object.keys(t5).filter((e7) => e7 in n6).forEach((o4) => {
              Hn(n6[o4])(e6, t5);
            });
          });
        }(e5, i2, s3);
        break;
      case o.Commands.Ready:
      case o.Commands.Run:
        !function(e6, n5) {
          e6.allowed && n5.forEach((n6) => {
            Hn(n6)(e6);
          });
        }(e5, i2);
        break;
      case o.Commands.Session:
        !function(e6, n5) {
          if (!e6.session)
            return;
          n5.forEach((n6) => {
            Hn(n6)(e6, e6.session);
          });
        }(e5, i2);
    }
}
async function S2(e5, n4) {
  const { consent: o3 } = e5;
  let t4 = false;
  const s3 = {};
  return Object.entries(n4).forEach(([e6, n5]) => {
    const o4 = !!n5;
    s3[e6] = o4, t4 = t4 || o4;
  }), e5.consent = yn(o3, s3), A2(e5, "consent", void 0, s3), t4 ? y2(e5) : w2({ ok: true });
}
async function B2(e5, n4, t4, s3) {
  let a4;
  switch (n4) {
    case o.Commands.Config:
      Pn(t4) && yn(e5.config, t4, { shallow: false });
      break;
    case o.Commands.Consent:
      Pn(t4) && (a4 = await S2(e5, t4));
      break;
    case o.Commands.Custom:
      Pn(t4) && (e5.custom = yn(e5.custom, t4));
      break;
    case o.Commands.Destination:
      Pn(t4) && Cn(t4.push) && (a4 = await h2(e5, { code: t4 }, s3));
      break;
    case o.Commands.Globals:
      Pn(t4) && (e5.globals = yn(e5.globals, t4));
      break;
    case o.Commands.On:
      Dn(t4) && O2(e5, t4, s3);
      break;
    case o.Commands.Ready:
      A2(e5, "ready");
      break;
    case o.Commands.Run:
      a4 = await G(e5, t4);
      break;
    case o.Commands.Session:
      A2(e5, "session");
      break;
    case o.Commands.User:
      Pn(t4) && yn(e5.user, t4, { shallow: false });
  }
  return a4 || { ok: true, successful: [], queued: [], failed: [] };
}
function F2(e5, n4) {
  if (!n4.name)
    throw new Error("Event name is required");
  const [o3, t4] = n4.name.split(" ");
  if (!o3 || !t4)
    throw new Error("Event name is invalid");
  ++e5.count;
  const { timestamp: s3 = Date.now(), group: a4 = e5.group, count: i2 = e5.count } = n4, { name: c2 = `${o3} ${t4}`, data: r2 = {}, context: u = {}, globals: l3 = e5.globals, custom: d2 = {}, user: m = e5.user, nested: f2 = [], consent: g2 = e5.consent, id: p2 = `${s3}-${a4}-${i2}`, trigger: b = "", entity: h3 = o3, action: y3 = t4, timing: v3 = 0, version: k3 = { source: e5.version, tagging: e5.config.tagging || 0 }, source: w3 = { type: "collector", id: "", previous_id: "" } } = n4;
  return { name: c2, data: r2, context: u, globals: l3, custom: d2, user: m, nested: f2, consent: g2, id: p2, trigger: b, entity: h3, action: y3, timestamp: s3, timing: v3, group: a4, count: i2, version: k3, source: w3 };
}
async function G(e5, n4) {
  e5.allowed = true, e5.count = 0, e5.group = An(), e5.timing = Date.now(), n4 && (n4.consent && (e5.consent = yn(e5.consent, n4.consent)), n4.user && (e5.user = yn(e5.user, n4.user)), n4.globals && (e5.globals = yn(e5.config.globalsStatic || {}, n4.globals)), n4.custom && (e5.custom = yn(e5.custom, n4.custom))), Object.values(e5.destinations).forEach((e6) => {
    e6.queue = [];
  }), e5.queue = [], e5.round++;
  const o3 = await y2(e5);
  return A2(e5, "run"), o3;
}
function _2(e5, n4) {
  return ai(async (o3, t4 = {}) => await _n(async () => {
    let s3 = o3;
    if (t4.mapping) {
      const n5 = await Qn(s3, t4.mapping, e5);
      if (n5.ignore)
        return w2({ ok: true });
      if (t4.mapping.consent) {
        if (!Ln(t4.mapping.consent, e5.consent, n5.event.consent))
          return w2({ ok: true });
      }
      s3 = n5.event;
    }
    const a4 = n4(s3), i2 = F2(e5, a4);
    return await y2(e5, i2);
  }, () => w2({ ok: false }))(), "Push", e5.hooks);
}
async function J2(e5) {
  const n4 = yn({ globalsStatic: {}, sessionStatic: {}, tagging: 0, verbose: false, onLog: o3, run: true }, e5, { merge: false, extend: false });
  function o3(e6, o4) {
    Zn({ message: e6 }, o4 || n4.verbose);
  }
  n4.onLog = o3;
  const t4 = { ...n4.globalsStatic, ...e5.globals }, s3 = { allowed: false, config: n4, consent: e5.consent || {}, count: 0, custom: e5.custom || {}, destinations: {}, globals: t4, group: "", hooks: {}, on: {}, queue: [], round: 0, session: void 0, timing: Date.now(), user: e5.user || {}, version: "0.3.0", sources: {}, push: void 0, command: void 0 };
  return s3.push = _2(s3, (e6) => ({ timing: Math.round((Date.now() - s3.timing) / 10) / 100, source: { type: "collector", id: "", previous_id: "" }, ...e6 })), s3.command = function(e6, n5) {
    return ai(async (o4, t5, s4) => await _n(async () => await n5(e6, o4, t5, s4), () => w2({ ok: false }))(), "Command", e6.hooks);
  }(s3, B2), s3.destinations = await C2(0, e5.destinations || {}), s3;
}
async function Q(e5, n4 = {}) {
  const o3 = {};
  for (const [t4, s3] of Object.entries(n4)) {
    const { code: n5, config: a4 = {}, env: i2 = {}, primary: c2 } = s3, r2 = { push: (n6, o4 = {}) => e5.push(n6, { ...o4, mapping: a4 }), command: e5.command, sources: e5.sources, elb: e5.sources.elb.push, ...i2 }, u = await _n(n5)(a4, r2);
    u && (c2 && (u.config = { ...u.config, primary: c2 }), o3[t4] = u);
  }
  return o3;
}
async function T2(e5) {
  e5 = e5 || {};
  const n4 = await J2(e5), o3 = (t4 = n4, { type: "elb", config: {}, push: async (e6, n5, o4, s4, a5, i3) => {
    if ("string" == typeof e6 && e6.startsWith("walker ")) {
      const s5 = e6.replace("walker ", "");
      return t4.command(s5, n5, o4);
    }
    let c3;
    if ("string" == typeof e6)
      c3 = { name: e6 }, n5 && "object" == typeof n5 && !Array.isArray(n5) && (c3.data = n5);
    else {
      if (!e6 || "object" != typeof e6)
        return { ok: false, successful: [], queued: [], failed: [] };
      c3 = e6, n5 && "object" == typeof n5 && !Array.isArray(n5) && (c3.data = { ...c3.data || {}, ...n5 });
    }
    return s4 && "object" == typeof s4 && (c3.context = s4), a5 && Array.isArray(a5) && (c3.nested = a5), i3 && "object" == typeof i3 && (c3.custom = i3), t4.push(c3);
  } });
  var t4;
  n4.sources.elb = o3;
  const s3 = await Q(n4, e5.sources || {});
  Object.assign(n4.sources, s3);
  const { consent: a4, user: i2, globals: c2, custom: r2 } = e5;
  a4 && await n4.command("consent", a4), i2 && await n4.command("user", i2), c2 && Object.assign(n4.globals, c2), r2 && Object.assign(n4.custom, r2), n4.config.run && await n4.command("run");
  let u = o3.push;
  const l3 = Object.values(n4.sources).filter((e6) => "elb" !== e6.type), d2 = l3.find((e6) => e6.config.primary);
  return d2 ? u = d2.push : l3.length > 0 && (u = l3[0].push), { collector: n4, elb: u };
}

// node_modules/@walkeros/server-source-express/dist/index.mjs
import e3 from "express";
import o2 from "cors";
var r = un.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
var n2 = un.union([un.string(), un.array(un.string()), un.literal("*")]);
var a2 = un.object({ origin: n2.describe("Allowed origins (* for all, URL string, or array of URLs)").optional(), methods: un.array(r).describe("Allowed HTTP methods").optional(), headers: un.array(un.string()).describe("Allowed request headers").optional(), credentials: un.boolean().describe("Allow credentials (cookies, authorization headers)").optional(), maxAge: un.number().int().positive().describe("Preflight cache duration in seconds").optional() });
var l = un.object({ port: un.number().int().min(0).max(65535).describe("HTTP server port to listen on. Use 0 for random available port. If not provided, server will not start (app only mode)").optional(), path: un.string().describe("Event collection endpoint path").default("/collect"), cors: un.union([un.boolean(), a2]).describe("CORS configuration: false = disabled, true = allow all origins (default), object = custom configuration").default(true), status: un.boolean().describe("Enable health check endpoints (/health, /ready)").default(true) });
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
var p = async (t4, r2) => {
  const n4 = l.parse(t4.settings || {}), a4 = e3();
  if (a4.use(e3.json({ limit: "1mb" })), false !== n4.cors) {
    const e5 = true === n4.cors ? {} : n4.cors;
    a4.use(o2(e5));
  }
  const i2 = async (e5, o3) => {
    try {
      if ("OPTIONS" === e5.method)
        return c(o3, n4.cors), void o3.status(204).send();
      if ("GET" === e5.method) {
        const t5 = ei(e5.url);
        return t5 && "object" == typeof t5 && await r2.push(t5), o3.set("Content-Type", "image/gif"), o3.set("Cache-Control", "no-cache, no-store, must-revalidate"), void o3.send(d);
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
  if (a4.post(n4.path, i2), a4.get(n4.path, i2), a4.options(n4.path, i2), n4.status && (a4.get("/health", (e5, o3) => {
    o3.json({ status: "ok", timestamp: Date.now(), source: "express" });
  }), a4.get("/ready", (e5, o3) => {
    o3.json({ status: "ready", timestamp: Date.now(), source: "express" });
  })), void 0 !== n4.port) {
    p2 = a4.listen(n4.port, () => {
      console.log(`\u2705 Express source listening on port ${n4.port}`), console.log(`   POST ${n4.path} - Event collection (JSON body)`), console.log(`   GET ${n4.path} - Pixel tracking (query params)`), console.log(`   OPTIONS ${n4.path} - CORS preflight`), n4.status && (console.log("   GET /health - Health check"), console.log("   GET /ready - Readiness check"));
    });
    const e5 = () => {
      p2 && p2.close();
    };
    process.on("SIGTERM", e5), process.on("SIGINT", e5);
  }
  return { type: "express", config: { ...t4, settings: n4 }, push: i2, app: a4, server: p2 };
};

// node_modules/@walkeros/destination-demo/dist/index.mjs
var e4 = Object.defineProperty;
var n3 = (n4, o3) => {
  for (var i2 in o3)
    e4(n4, i2, { get: o3[i2], enumerable: true });
};
var i = {};
n3(i, { env: () => t3 });
var t3 = {};
n3(t3, { init: () => s2, push: () => a3, simulation: () => l2 });
var s2 = { log: void 0 };
var a3 = { log: Object.assign(() => {
}, {}) };
var l2 = ["call:log"];
var g = { type: "demo", config: { settings: { name: "demo" } }, init({ config: e5, env: n4 }) {
  (n4?.log || console.log)(`[${{ name: "demo", ...e5?.settings }.name}] initialized`);
}, push(e5, { config: n4, env: o3 }) {
  const i2 = o3?.log || console.log, t4 = { name: "demo", ...n4?.settings }, s3 = t4.values ? function(e6, n5) {
    const o4 = {};
    for (const i3 of n5) {
      const n6 = i3.split(".").reduce((e7, n7) => e7?.[n7], e6);
      void 0 !== n6 && (o4[i3] = n6);
    }
    return o4;
  }(e5, t4.values) : e5;
  i2(`[${t4.name}] ${JSON.stringify(s3, null, 2)}`);
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
