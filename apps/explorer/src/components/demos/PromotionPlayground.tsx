import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  getErrorMessage,
  isArray,
  isObject,
  isString,
  Level,
  type Collector,
  type Logger,
  type Mapping,
  type WalkerOS,
} from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import { startFlow } from '@walkeros/collector';
import { productCardCss, productCardHtml } from './product-card.demo';
import { Grid } from '../atoms/grid';
import { Preview } from '../molecules/preview';
import { CodeBox } from '../molecules/code-box';
import {
  createGtagDestination,
  type DestinationCode,
} from '../../helpers/destinations';

export interface PromotionPlaygroundProps {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  initialMapping?: string;
  labelPreview?: string;
  labelEvents?: string;
  labelMapping?: string;
  labelResult?: string;
  destination?: DestinationCode;
}

const defaultMapping = `{
  "product": {
    "view": {
      "name": "view_item",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
        }
      }
    },
    "add": {
      "name": "add_to_cart",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
        }
      }
    },
    "save": {
      "name": "add_to_wishlist",
      "data": {
        "map": {
          "currency": { "value": "EUR" },
          "value": "data.price",
          "items": {
            "set": [
              {
                "map": {
                  "item_name": "data.name",
                  "item_variant": "data.taste",
                  "price": "data.price",
                  "quantity": { "value": 1 }
                }
              }
            ]
          }
        }
      }
    }
  }
}`;

/** The id of the mapped destination in the playground's collector. */
const DESTINATION_ID = 'gtag';

/** JSON nested as mapping rules: entity, then action, then a rule or a list of rules. */
function isRules(value: unknown): value is Mapping.Rules {
  return (
    isObject(value) &&
    Object.values(value).every(
      (actions) =>
        isObject(actions) &&
        Object.values(actions).every(
          (rule) => isObject(rule) || (isArray(rule) && rule.every(isObject)),
        ),
    )
  );
}

/** The Mapping box's text as rules, or why it is not applied. */
function parseMapping(
  text: string,
): { rules: Mapping.Rules } | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { error: `Mapping not applied: ${getErrorMessage(error)}` };
  }
  // The schema names what is wrong and where.
  const checked = schemas.RulesSchema.safeParse(json);
  if (!checked.success || !isRules(json)) {
    const issue = checked.success ? undefined : checked.error.issues[0];
    const at = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
    return {
      error: `Mapping not applied: ${issue?.message ?? 'not entity, action and rule objects'}${at}`,
    };
  }
  return { rules: json };
}

/** A collector log line in words: where it came from, what failed, and why. */
function logged(
  message: string,
  context: Logger.LogContext,
  scope: string[],
): string {
  const detail: unknown = context.error;
  const cause = isString(detail)
    ? detail
    : isObject(detail) && isString(detail.message)
      ? detail.message
      : undefined;
  return [...scope, message, ...(cause ? [cause] : [])].join(': ');
}

/**
 * PromotionPlayground - Full walkerOS demonstration with live code editing
 *
 * Shows the complete chain, one box each:
 * 1. Preview - the live page, with HTML/CSS/JS tabs to edit it; captures real events
 * 2. Events - the events the preview sent
 * 3. Mapping - editable rules for the destination
 * 4. Result - the destination call each event becomes
 *
 * One collector runs the flow: Preview binds a browser source to it, and its
 * destinations fill the Events and Result boxes. Whatever fails says so in
 * the box it concerns.
 */
export function PromotionPlayground({
  initialHtml = productCardHtml,
  initialCss = productCardCss,
  initialJs = '',
  initialMapping = defaultMapping,
  labelPreview = 'Preview',
  labelEvents = 'Events',
  labelMapping = 'Mapping',
  labelResult = 'Result',
  destination: destinationProp,
}: PromotionPlaygroundProps) {
  // Memoize destination to prevent useEffect re-runs on every render
  // Default prop values create new objects each render, breaking effect dependencies
  const destination = useMemo(
    () => destinationProp ?? createGtagDestination(),
    [destinationProp],
  );
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [mappingInput, setMappingInput] = useState(initialMapping);
  const [initialRules] = useState(() => parseMapping(initialMapping));
  const [mappingError, setMappingError] = useState(
    'error' in initialRules ? initialRules.error : undefined,
  );
  const [eventJson, setEventJson] = useState('');
  const [output, setOutput] = useState('');
  const [startError, setStartError] = useState<string>();
  const [resultError, setResultError] = useState<string>();
  const [collector, setCollector] = useState<Collector.Instance>();

  // The rules in force: the last valid mapping, read when the collector starts.
  const rulesRef = useRef<Mapping.Rules>(
    'rules' in initialRules ? initialRules.rules : {},
  );
  const collectorRef = useRef<Collector.Instance | null>(null);
  const lastEventRef = useRef<WalkerOS.Event | null>(null);
  const mappingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // One collector per destination, shut down when it goes
  useEffect(() => {
    let active = true;
    let started: Collector.Instance | undefined;

    startFlow({
      destinations: {
        // Capture raw events for display in Events column. A new event
        // empties Result first: it shows this event's call or none, never
        // the previous one.
        rawCapture: {
          code: {
            type: 'rawCapture',
            config: {},
            push: (event: WalkerOS.Event) => {
              if (!active) return;
              lastEventRef.current = event;
              setEventJson(JSON.stringify(event, null, 2));
              setOutput('');
              setResultError(undefined);
            },
          },
        },
        // Transform and display formatted output in Result column
        [DESTINATION_ID]: {
          code: destination,
          config: { mapping: rulesRef.current },
          env: {
            elb: (formatted: string) => {
              if (!active) return;
              setOutput(formatted);
              setResultError(undefined);
            },
          },
        },
      },
      consent: { functional: true, marketing: true },
      user: { session: 'playground' },
      // A failure the collector logs (a destination push, a mapping) shows
      // in the Result box, besides the console.
      logger: {
        handler: (level, message, context, scope, original) => {
          original(level, message, context, scope);
          if (active && level === Level.ERROR)
            setResultError(logged(message, context, scope));
        },
      },
    }).then(
      (flow) => {
        started = flow.collector;
        if (!active) {
          void shutdown(flow.collector);
          return;
        }
        // An edit applied while the collector started is in rulesRef only.
        const mapped = flow.collector.destinations[DESTINATION_ID];
        if (mapped) mapped.config.mapping = rulesRef.current;
        collectorRef.current = flow.collector;
        setStartError(undefined);
        setCollector(flow.collector);
      },
      (thrown: unknown) => {
        if (active)
          setStartError(
            `The collector did not start: ${getErrorMessage(thrown)}`,
          );
      },
    );

    return () => {
      active = false;
      collectorRef.current = null;
      setCollector(undefined);
      if (started) void shutdown(started);
    };
  }, [destination]);

  // Mapping edits apply once typing pauses: the destination takes the new
  // rules and the last event runs through it again, to that destination only.
  const handleMappingChange = useCallback((text: string) => {
    setMappingInput(text);
    clearTimeout(mappingTimerRef.current);
    mappingTimerRef.current = setTimeout(() => {
      const parsed = parseMapping(text);
      if ('error' in parsed) {
        setMappingError(parsed.error);
        return;
      }
      setMappingError(undefined);
      rulesRef.current = parsed.rules;
      const current = collectorRef.current;
      const mapped = current?.destinations[DESTINATION_ID];
      if (!current || !mapped) return;
      mapped.config.mapping = parsed.rules;
      const last = lastEventRef.current;
      if (!last) return;
      setOutput('');
      setResultError(undefined);
      current
        .push(last, { include: [DESTINATION_ID] })
        .catch((thrown: unknown) =>
          setResultError(
            `The event did not run again: ${getErrorMessage(thrown)}`,
          ),
        );
    }, 500);
  }, []);

  // A pending edit goes with the playground.
  useEffect(() => () => clearTimeout(mappingTimerRef.current), []);

  return (
    <Grid boxWidth={350} rowHeight={600}>
      <Preview
        label={labelPreview}
        html={html}
        css={css}
        js={js}
        collector={collector}
        editable
        onHtmlChange={setHtml}
        onCssChange={setCss}
        onJsChange={setJs}
        wordWrap
      />

      <CodeBox
        label={labelEvents}
        code={eventJson}
        language="json"
        disabled
        wordWrap
        placeholder="Click the preview to see its events."
        error={startError}
      />

      <CodeBox
        label={labelMapping}
        code={mappingInput}
        onChange={handleMappingChange}
        language="json"
        wordWrap
        folding
        sticky
        error={mappingError}
        errorRole="status"
      />

      <CodeBox
        label={labelResult}
        code={output}
        language="javascript"
        disabled
        wordWrap
        placeholder={
          eventJson
            ? 'No gtag call for this event.'
            : "Each event's gtag call appears here."
        }
        error={resultError}
      />
    </Grid>
  );
}

/** Shut a collector down; a failure goes to its own log. */
async function shutdown(collector: Collector.Instance): Promise<void> {
  await collector.command('shutdown').catch((thrown: unknown) => {
    collector.logger.error('playground shutdown failed', {
      error: getErrorMessage(thrown),
    });
  });
}
