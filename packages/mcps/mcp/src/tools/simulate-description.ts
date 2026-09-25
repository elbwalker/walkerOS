/**
 * The flow_simulate tool description, shared by the registered tool and the
 * declarative `TOOL_DEFINITIONS` registry (which must not import the tool's
 * node-only code).
 */
export const FLOW_SIMULATE_DESCRIPTION =
  'Simulate events through a walkerOS flow without making real API calls. ' +
  'For destinations: event is a walkerOS event { name: "entity action", data: {...} }. ' +
  'For sources: event is { content, trigger?: { type?, options? } }, where content is the ' +
  'walkerOS event { name: "entity action", data: {...} }. Only the simulated source starts. ' +
  'step (required) targets the step to simulate, e.g. "destination.gtag". ' +
  'Use flow_examples to discover available test data. ' +
  'A destination simulation starts only its target destination. ' +
  'Consent: state.consent is the collector consent the step starts from ' +
  '(transformer, collector and destination steps). A destination with ' +
  'require: ["consent"] waits until consent is present, so pass state.consent to start it; ' +
  'a destination with consent: { marketing: true } receives an event only when that ' +
  "consent is granted in state.consent or in the event's own consent. " +
  'When a destination sends nothing, the result says why (waiting for its require, or a consent skip). ' +
  'command runs a step example with command (e.g. "consent") on a destination: ' +
  "event is the command's data, state.consent still applies first. " +
  'Mapping transforms event names and data at the destination level. ' +
  'Policy redacts or injects fields before mapping runs.';
