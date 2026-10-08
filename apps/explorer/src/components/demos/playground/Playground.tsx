import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getErrorMessage,
  getMappingEvent,
  isObject,
  isString,
  Level,
  type Collector,
  type Logger,
  type Mapping,
  type WalkerOS,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import {
  destinationGtag,
  type DestinationGtag,
} from '@walkeros/web-destination-gtag';
import { cx } from '../../../design/components/cx';
import { Button } from '../../../design/components/atoms/Button';
import { Eyebrow } from '../../../design/components/atoms/Eyebrow';
import { Icon } from '../../../design/components/atoms/Icon';
import { parseMapping } from '../../../helpers/mapping-rules';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';
import { CopyButton } from './CopyButton';
import { CodeLines, jsonLines, type Line } from './highlight';
import {
  playgroundCardCss,
  playgroundHighlightCss,
  playgroundHtml,
  playgroundJs,
  playgroundMapping,
  playgroundMeasurementId,
} from './defaults';

export interface PlaygroundProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
}

type Tab = 'preview' | 'html' | 'js';
type Highlight = 'entity' | 'property' | 'action' | 'context' | 'globals';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'html', label: 'HTML' },
  { id: 'js', label: 'JS' },
];

const HIGHLIGHTS: Array<{ id: Highlight; label: string }> = [
  { id: 'entity', label: 'Entity' },
  { id: 'property', label: 'Property' },
  { id: 'action', label: 'Action' },
  { id: 'context', label: 'Context' },
  { id: 'globals', label: 'Globals' },
];

const NO_HIGHLIGHTS: Record<Highlight, boolean> = {
  entity: false,
  property: false,
  action: false,
  context: false,
  globals: false,
};

/** The destination ids in the playground's collector. */
const CAPTURE_ID = 'capture';
const GA4_ID = 'ga4';

/** How long the "nothing is sent" note stays. */
const NOTE_MS = 3200;

/** A `data-elbaction` value with a click trigger. */
const CLICK_ACTION = /(^|;)\s*click\s*(:|;|$)/;

/** Per-rule gtag settings: absent, or objects for ga4, ads and gtm. */
function isGtagSettings(settings: unknown): boolean {
  if (settings === undefined) return true;
  if (!isObject(settings)) return false;
  const { ga4, ads, gtm } = settings;
  return (
    (ga4 === undefined || isObject(ga4)) &&
    (gtm === undefined || isObject(gtm)) &&
    (ads === undefined ||
      (isObject(ads) && (ads.label === undefined || isString(ads.label))))
  );
}

/** Rules the gtag destination accepts: every rule's settings fit it. */
function isGtagRules(rules: Mapping.Rules): rules is DestinationGtag.Rules {
  return Object.values(rules).every((actions) =>
    Object.values(actions ?? {}).every((rule) =>
      (Array.isArray(rule) ? rule : [rule]).every((item) =>
        isGtagSettings(item.settings),
      ),
    ),
  );
}

/** The editor's text as gtag rules, or why it is not applied. */
function parseGtagMapping(
  text: string,
): { rules: DestinationGtag.Rules } | { error: string } {
  const parsed = parseMapping(text);
  if ('error' in parsed) return parsed;
  if (!isGtagRules(parsed.rules))
    return {
      error:
        "Mapping not applied: a rule's settings must hold ga4, ads or gtm objects",
    };
  return { rules: parsed.rules };
}

const DEFAULT_RULES: DestinationGtag.Rules = (() => {
  const parsed = parseGtagMapping(playgroundMapping);
  return 'rules' in parsed ? parsed.rules : {};
})();

/** The gtag call the destination made for the latest event. */
interface GtagCall {
  name: string;
  params: unknown;
}

/** Tag every walkerOS element with the highlight groups it belongs to. */
function annotate(root: Element): void {
  root.querySelectorAll('*').forEach((element) => {
    const groups: Highlight[] = [];
    for (const { name } of Array.from(element.attributes)) {
      if (name === 'data-elb') groups.push('entity');
      else if (name === 'data-elbaction') groups.push('action');
      else if (name === 'data-elbcontext') groups.push('context');
      else if (name === 'data-elbglobals') groups.push('globals');
      else if (name.startsWith('data-elb-')) groups.push('property');
    }
    if (groups.length) element.setAttribute('data-hl', groups.join(' '));
    if (CLICK_ACTION.test(element.getAttribute('data-elbaction') ?? ''))
      element.setAttribute('data-nudge', '');
  });
}

/** The lines of the mapping text that hold the rule for `entity action`. */
function ruleRange(
  text: string,
  mappingKey: string | undefined,
): [number, number] | undefined {
  if (!mappingKey) return;
  const [entity, action] = mappingKey.split(' ');
  const lines = text.split('\n');
  const keyLine = (key: string, from: number) => {
    const quoted = JSON.stringify(key);
    return lines.findIndex(
      (line, index) =>
        index > from && line.trimStart().startsWith(`${quoted}:`),
    );
  };
  const entityLine = keyLine(entity, -1);
  if (entityLine < 0) return;
  const actionLine = keyLine(action, entityLine);
  if (actionLine < 0) return;
  const indent = lines[actionLine].search(/\S/);
  const end = lines.findIndex(
    (line, index) =>
      index > actionLine &&
      line.search(/\S/) === indent &&
      /^\s*[}\]]/.test(line),
  );
  return [actionLine, end < 0 ? actionLine : end];
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

/** Shut a collector down; a failure goes to its own log. */
async function shutdown(collector: Collector.Instance): Promise<void> {
  await collector.command('shutdown').catch((thrown: unknown) => {
    collector.logger.error('playground shutdown failed', {
      error: getErrorMessage(thrown),
    });
  });
}

function resultLines(call: GtagCall): Line[] {
  const lines: Line[] = [
    {
      depth: 0,
      tokens: [
        { kind: 'fn', text: 'gtag' },
        { kind: 'punct', text: '(' },
        { kind: 'str', text: "'event'" },
        { kind: 'punct', text: ', ' },
        { kind: 'str', text: `'${call.name}'` },
        { kind: 'punct', text: ', {' },
      ],
    },
  ];
  const entries = isObject(call.params) ? Object.entries(call.params) : [];
  entries.forEach(([key, value], index) =>
    jsonLines(value, 1, key, index === entries.length - 1, lines),
  );
  lines.push({ depth: 0, tokens: [{ kind: 'punct', text: '});' }] });
  return lines;
}

function Panel({
  step,
  name,
  area,
  bar,
  children,
}: {
  step: number;
  name: string;
  area: string;
  bar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`elb-pg-panel elb-pg-panel--${area}`} aria-label={name}>
      <div className="elb-pg-bar">
        <span className="elb-pg-step" aria-hidden="true">
          {step}
        </span>
        <h2 className="elb-pg-name">{name}</h2>
        {bar}
      </div>
      {children}
    </section>
  );
}

/**
 * The walkerOS playground: a tagged component, the event it sends, the
 * mapping and the vendor call it becomes, live.
 *
 * One real flow runs the chain. `startFlow` starts a collector with the
 * browser source scoped to the preview's shadow root and the gtag destination
 * with the editor's mapping. The destination's `window` is a stub that hands
 * each gtag call to the Result panel instead of sending it to GA4.
 */
export function Playground({
  eyebrow = 'Playground',
  title = 'From markup to vendor, live.',
  lead = 'Change the component, its data or the mapping, and watch every view and click turn into a GA4 event.',
}: PlaygroundProps) {
  const [tab, setTab] = useState<Tab>('preview');
  const [html, setHtml] = useState(playgroundHtml);
  const [renderedHtml, setRenderedHtml] = useState(playgroundHtml);
  const [mapText, setMapText] = useState(playgroundMapping);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [mapError, setMapError] = useState<string>();
  const [highlights, setHighlights] = useState(NO_HIGHLIGHTS);
  const [clicked, setClicked] = useState(false);
  const [event, setEvent] = useState<WalkerOS.Event>();
  const [call, setCall] = useState<GtagCall | null>();
  const [matchKey, setMatchKey] = useState<string>();
  const [note, setNote] = useState<string>();
  const [flowError, setFlowError] = useState<string>();
  // Bumped by Reset: renders the preview and starts a new flow.
  const [generation, setGeneration] = useState(0);

  const hostRef = useRef<HTMLDivElement>(null);
  const mapEditorRef = useRef<CodeEditorHandle>(null);
  const collectorRef = useRef<Collector.Instance | null>(null);
  const rulesRef = useRef(rules);
  const lastEventRef = useRef<WalkerOS.Event | null>(null);
  const mapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const shadowRoot = useCallback((): ShadowRoot | undefined => {
    const host = hostRef.current;
    if (!host) return;
    return host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  }, []);

  // Each rendered component gets its own flow: the source binds to the new
  // markup and its load triggers fire, as on a page load.
  useEffect(() => {
    const shadow = shadowRoot();
    if (!shadow) return;
    shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = playgroundHighlightCss + playgroundCardCss;
    // The source's scope: an element, so data-elbglobals inside it count.
    const root = document.createElement('div');
    root.innerHTML = renderedHtml;
    annotate(root);
    shadow.append(style, root);

    let active = true;
    let started: Collector.Instance | undefined;
    const gtagEnv: DestinationGtag.Env = {
      window: {
        gtag: (...args: unknown[]) => {
          if (!active || args[0] !== 'event') return;
          setCall({ name: String(args[1]), params: args[2] });
        },
        dataLayer: [],
      },
      document: {
        createElement: () => ({
          src: '',
          setAttribute: () => {},
          removeAttribute: () => {},
        }),
        head: { appendChild: () => {} },
      },
    };

    startFlow({
      consent: { functional: true, marketing: true },
      user: { session: 'playground' },
      sources: {
        browser: {
          code: sourceBrowser,
          config: {
            // Scoped to the preview, without page-wide globals: each render
            // starts a new flow while the previous one shuts down.
            settings: {
              scope: root,
              pageview: false,
              elb: false,
              elbLayer: false,
            },
          },
        },
      },
      destinations: {
        // The full event, for the Event panel. It runs before the gtag
        // destination, so a new event clears the previous result first.
        [CAPTURE_ID]: {
          code: {
            type: CAPTURE_ID,
            config: {},
            push: (pushed: WalkerOS.Event) => {
              if (!active) return;
              lastEventRef.current = pushed;
              setEvent(pushed);
              setCall(null);
              setNote(undefined);
              if (pushed.trigger === 'click') setClicked(true);
            },
          },
        },
        [GA4_ID]: {
          code: destinationGtag,
          config: {
            settings: { ga4: { measurementId: playgroundMeasurementId } },
            mapping: rulesRef.current,
          },
          env: gtagEnv,
        },
      },
      logger: {
        handler: (level, message, context, scope, original) => {
          original(level, message, context, scope);
          if (active && level === Level.ERROR)
            setFlowError(logged(message, context, scope));
        },
      },
    }).then(
      (flow) => {
        started = flow.collector;
        if (!active) {
          void shutdown(flow.collector);
          return;
        }
        collectorRef.current = flow.collector;
        setFlowError(undefined);
      },
      (thrown: unknown) => {
        if (active)
          setFlowError(
            `The collector did not start: ${getErrorMessage(thrown)}`,
          );
      },
    );

    return () => {
      active = false;
      collectorRef.current = null;
      if (started) void shutdown(started);
    };
  }, [renderedHtml, generation, shadowRoot]);

  // A click on a button or link without a click action sends nothing: say so.
  useEffect(() => {
    const shadow = shadowRoot();
    if (!shadow) return;
    const onClick = (clickEvent: Event) => {
      const path = clickEvent.composedPath();
      const control = path.find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          (node.tagName === 'BUTTON' || node.tagName === 'A'),
      );
      if (!control) return;
      if (control.tagName === 'A') clickEvent.preventDefault();
      const start = path.indexOf(control);
      const hasAction = path
        .slice(start)
        .some(
          (node) =>
            node instanceof HTMLElement &&
            CLICK_ACTION.test(node.getAttribute('data-elbaction') ?? ''),
        );
      if (hasAction) return;
      setNote(
        'This element has no click action in data-elbaction, so nothing is sent.',
      );
      clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(() => setNote(undefined), NOTE_MS);
    };
    shadow.addEventListener('click', onClick);
    return () => shadow.removeEventListener('click', onClick);
  }, [shadowRoot]);

  // The rule the collector picks for the latest event, by its own lookup.
  useEffect(() => {
    let active = true;
    if (!event) {
      setMatchKey(undefined);
      return;
    }
    getMappingEvent(event, rules).then(
      ({ mappingKey }) => {
        if (active) setMatchKey(mappingKey || undefined);
      },
      () => {
        if (active) setMatchKey(undefined);
      },
    );
    return () => {
      active = false;
    };
  }, [event, rules]);

  const range = useMemo(
    () => ruleRange(mapText, matchKey),
    [mapText, matchKey],
  );
  const rangeRef = useRef(range);
  rangeRef.current = range;

  // A new event brings its rule into view; typing does not scroll.
  useEffect(() => {
    if (rangeRef.current)
      mapEditorRef.current?.scrollToLine(rangeRef.current[0]);
  }, [event, matchKey]);

  // Mapping edits apply once typing pauses: the destination takes the new
  // rules and the last event runs through it again, to that destination only.
  const changeMapping = useCallback((text: string) => {
    setMapText(text);
    clearTimeout(mapTimerRef.current);
    mapTimerRef.current = setTimeout(() => {
      const parsed = parseGtagMapping(text);
      if ('error' in parsed) {
        setMapError(
          `Invalid mapping, using the last valid one. ${parsed.error.replace(/^Mapping not applied: /, '')}`,
        );
        return;
      }
      setMapError(undefined);
      rulesRef.current = parsed.rules;
      setRules(parsed.rules);
      const collector = collectorRef.current;
      const destination = collector?.destinations[GA4_ID];
      if (!collector || !destination) return;
      destination.config.mapping = parsed.rules;
      const last = lastEventRef.current;
      if (!last) return;
      setCall(null);
      collector
        .push(last, { include: [GA4_ID] })
        .catch((thrown: unknown) =>
          setFlowError(
            `The event did not run again: ${getErrorMessage(thrown)}`,
          ),
        );
    }, 300);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(mapTimerRef.current);
      clearTimeout(noteTimerRef.current);
    },
    [],
  );

  const selectTab = (next: Tab) => {
    setTab(next);
    if (next === 'preview') setRenderedHtml(html);
  };

  const reset = () => {
    clearTimeout(mapTimerRef.current);
    clearTimeout(noteTimerRef.current);
    rulesRef.current = DEFAULT_RULES;
    lastEventRef.current = null;
    setTab('preview');
    setHtml(playgroundHtml);
    setRenderedHtml(playgroundHtml);
    setMapText(playgroundMapping);
    setRules(DEFAULT_RULES);
    setMapError(undefined);
    setHighlights(NO_HIGHLIGHTS);
    setClicked(false);
    setEvent(undefined);
    setCall(undefined);
    setNote(undefined);
    setFlowError(undefined);
    setGeneration((current) => current + 1);
  };

  const hostClass = cx(
    ...HIGHLIGHTS.filter(({ id }) => highlights[id]).map(
      ({ id }) => `hl-${id}`,
    ),
    !clicked && 'nudge',
  );

  const eventText = event ? JSON.stringify(event, null, 2) : '';
  const resultText = call
    ? `gtag('event', '${call.name}', ${JSON.stringify(call.params, null, 2)});`
    : '';

  return (
    <div className="elb-pg">
      <div className="elb-pg__head">
        <div className="elb-pg__intro">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="elb-pg__title">{title}</h1>
          <p className="elb-pg__lead">{lead}</p>
        </div>
        <Button variant="secondary" onClick={reset} className="elb-pg__reset">
          <Icon name="reload" />
          Reset
        </Button>
      </div>

      <div className="elb-pg__grid">
        <Panel
          step={1}
          name="Component"
          area="comp"
          bar={
            <>
              <div className="elb-pg-tabs" role="tablist" aria-label="View">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    className="elb-pg-tab"
                    aria-selected={tab === id}
                    onClick={() => selectTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab !== 'preview' && (
                <span
                  className={cx(
                    'elb-pg-meta elb-pg-meta--end',
                    tab === 'html' && 'elb-pg-meta--edit',
                  )}
                >
                  {tab === 'html' ? 'editable' : 'read-only'}
                </span>
              )}
            </>
          }
        >
          <div className="elb-pg-pane" hidden={tab !== 'preview'}>
            <div className="elb-pg-chips">
              <span>Highlight</span>
              {HIGHLIGHTS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`elb-pg-chip elb-pg-chip--${id}`}
                  aria-pressed={highlights[id]}
                  onClick={() =>
                    setHighlights((current) => ({
                      ...current,
                      [id]: !current[id],
                    }))
                  }
                >
                  <i aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div ref={hostRef} className={cx('elb-pg-preview', hostClass)} />
          </div>
          {tab === 'html' && (
            <CodeEditor
              className="elb-pg-editor--tall"
              value={html}
              kind="html"
              label="Component HTML"
              onChange={setHtml}
            />
          )}
          {tab === 'js' && (
            <CodeEditor
              className="elb-pg-editor--tall"
              value={playgroundJs}
              kind="js"
              label="Flow configuration"
            />
          )}
        </Panel>

        <Panel
          step={2}
          name="Event"
          area="event"
          bar={<CopyButton text={eventText} label="Copy event" />}
        >
          {!event && (
            <div className="elb-pg-status">Waiting for the first event…</div>
          )}
          {note && (
            <div className="elb-pg-note" role="status">
              {note}
            </div>
          )}
          <div className="elb-pg-scroll" tabIndex={0} aria-label="Latest event">
            {event && <CodeLines lines={jsonLines(event)} />}
          </div>
        </Panel>

        <Panel
          step={3}
          name="Mapping"
          area="mapping"
          bar={
            <>
              <span className="elb-pg-meta elb-pg-meta--edit">editable</span>
              <CopyButton text={mapText} label="Copy mapping" />
            </>
          }
        >
          {mapError && (
            <div className="elb-pg-error" role="status">
              {mapError}
            </div>
          )}
          <CodeEditor
            ref={mapEditorRef}
            className="elb-pg-scroll elb-pg-scroll--map"
            value={mapText}
            kind="json"
            label="Mapping"
            onChange={changeMapping}
            highlight={range}
          />
        </Panel>

        <Panel
          step={4}
          name="Result"
          area="result"
          bar={
            <>
              <span className="elb-pg-meta">gtag</span>
              {call && <span className="elb-pg-sent">sent</span>}
              <CopyButton text={resultText} label="Copy result" />
            </>
          }
        >
          {flowError && (
            <div className="elb-pg-error" role="status">
              {flowError}
            </div>
          )}
          <div className="elb-pg-out">
            {call ? (
              <CodeLines lines={resultLines(call)} />
            ) : (
              event &&
              call === null && (
                <CodeLines
                  lines={[
                    {
                      depth: 0,
                      tokens: [
                        {
                          kind: 'dim',
                          text: `// No gtag call for "${event.name}", nothing is sent to GA4.`,
                        },
                      ],
                    },
                  ]}
                />
              )
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
