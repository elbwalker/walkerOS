import React, {
  Fragment,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Button } from '../atoms/Button';
import { CodeTokens } from '../atoms/CodeTokens';
import { Icon, type IconName } from '../atoms/Icon';
import { InlineCode } from '../atoms/InlineCode';
import { useCopy, type CopyState } from '../atoms/useCopy';
import { tok, type CodeToken } from '../codeTokens';
import { cx } from '../cx';

/**
 * The fields of a walkerOS event the log reads by name. A `WalkerOS.Event`
 * fits; the detail shows the other fields the event carries too.
 */
export interface EventLogEvent {
  name: string;
  entity?: string;
  action?: string;
  trigger?: string;
  timestamp?: number;
}

export interface EventLogRecord {
  /** The event's number in the session, shown as `#seq`; the caller counts. */
  seq: number;
  event: EventLogEvent;
}

export interface EventLogProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** The events, oldest first. */
  records: ReadonlyArray<EventLogRecord>;
  /**
   * The `seq` of the event shown in detail. Without a match the log follows
   * the newest event.
   */
  selectedSeq?: number | null;
  /**
   * Called with an event's `seq` on its click, and with null on a click on the
   * newest event: the log follows the newest again. Without it the rows are
   * disabled.
   */
  onSelect?: (seq: number | null) => void;
  /** Adds a Clear button while there are events. */
  onClear?: () => void;
  /** The hint under "No events yet". */
  emptyText?: ReactNode;
}

// The event fields the Fields view lists, in this order; JSON shows them all.
const SECTIONS = [
  'data',
  'context',
  'globals',
  'consent',
  'user',
  'nested',
] as const;

const VIEWS = [
  ['fields', 'Fields'],
  ['json', 'JSON'],
] as const;

type View = (typeof VIEWS)[number][0];

const COPY: Readonly<Record<CopyState, { label: string; icon: IconName }>> = {
  idle: { label: 'Copy', icon: 'copy' },
  done: { label: 'Copied', icon: 'check' },
  failed: { label: 'Copy failed', icon: 'warning' },
};

const isGroup = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

/** The event's time of day in the viewer's time zone, with its ISO form. */
function timeOf(timestamp: unknown): { iso: string; clock: string } | null {
  if (typeof timestamp !== 'number') return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const clock = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return { iso: date.toISOString(), clock };
}

/** A value as a field shows it: a string as it is, anything else as JSON. */
function valueToken(value: unknown): CodeToken {
  if (typeof value === 'string') return tok(value, 'str');
  if (typeof value === 'number' || typeof value === 'boolean')
    return tok(String(value), 'num');
  return tok(String(JSON.stringify(value)), 'text');
}

interface FieldRow {
  key: string;
  value: CodeToken;
  /** A note beside the value. */
  sub?: string;
}

/** The fields of one section of the event. */
function fieldRows(section: string, group: object): FieldRow[] {
  return Object.entries(group).map(([key, value]: [string, unknown]) => {
    // A context value is the value and its order.
    if (section === 'context' && Array.isArray(value) && value.length === 2)
      return { key, value: valueToken(value[0]), sub: `order ${value[1]}` };
    // A consent state reads as a word.
    if (section === 'consent' && typeof value === 'boolean')
      return { key, value: tok(value ? 'granted' : 'denied', 'str') };
    return { key, value: valueToken(value) };
  });
}

const JSON_TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}[\],]/g;

/** One line of printed JSON as code runs: keys, strings, numbers, punctuation. */
function jsonTokens(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let last = 0;
  for (const match of line.matchAll(JSON_TOKEN)) {
    const [text, quoted, colon] = match;
    const at = match.index ?? 0;
    if (at > last) tokens.push(tok(line.slice(last, at), 'text'));
    if (quoted && colon) tokens.push(tok(quoted, 'key'), tok(colon, 'punct'));
    else if (quoted) tokens.push(tok(quoted, 'str'));
    else tokens.push(tok(text, /^[{}[\],]$/.test(text) ? 'punct' : 'num'));
    last = at + text.length;
  }
  if (last < line.length) tokens.push(tok(line.slice(last), 'text'));
  return tokens;
}

/** The name with its entity and action marked, when it is made of the two. */
function EventName({ event }: { event: EventLogEvent }) {
  const { name, entity, action } = event;
  if (!entity || !action || name !== `${entity} ${action}`) return <>{name}</>;
  return (
    <>
      <span className="elb-event-log__entity">{entity}</span>{' '}
      <span className="elb-event-log__action">{action}</span>
    </>
  );
}

/**
 * The sections of the event that have content, each a list of its fields.
 * Consent is always there: without a state it says none.
 */
function Fields({ event }: { event: EventLogEvent }) {
  const fields = new Map<string, unknown>(Object.entries(event));
  return (
    <div className="elb-event-log__sections">
      {SECTIONS.map((section) => {
        const group = fields.get(section);
        const rows = isGroup(group) ? fieldRows(section, group) : [];
        if (rows.length === 0 && section !== 'consent') return null;
        return (
          <div key={section} className="elb-event-log__section">
            <span className="elb-event-log__label">{section}</span>
            {rows.length === 0 ? (
              <span className="elb-event-log__field elb-event-log__sub">
                none
              </span>
            ) : (
              <dl className="elb-event-log__fields">
                {rows.map(({ key, value, sub }) => (
                  <div key={key} className="elb-event-log__field">
                    <dt>
                      <CodeTokens tokens={[tok(key, 'key')]} />
                    </dt>
                    <dd>
                      <CodeTokens tokens={[value]} />
                      {sub && <span className="elb-event-log__sub">{sub}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The whole event as printed JSON; its style keeps the line breaks. */
function Json({ text }: { text: string }) {
  return (
    <div className="elb-event-log__json">
      {text.split('\n').map((line, index) => (
        <Fragment key={index}>
          <CodeTokens tokens={jsonTokens(line)} />
          {'\n'}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * The walkerOS events of a session: a list, newest first, beside the selected
 * event as fields or as JSON. The list follows the page theme; the detail is a
 * code pane, dark in both themes. The caller holds the events and the
 * selection, and sizes it: give the root a height through `className` or
 * `style`; the list and the detail scroll inside it.
 */
export function EventLog({
  records,
  selectedSeq,
  onSelect,
  onClear,
  emptyText = 'Click, scroll or load something tagged on the page and its events show up here.',
  className,
  ...rest
}: EventLogProps) {
  const [view, setView] = useState<View>('fields');
  const [copyState, copy] = useCopy();
  const newest: EventLogRecord | undefined = records[records.length - 1];
  const selected =
    records.find((record) => record.seq === selectedSeq) ?? newest;
  const json = selected ? JSON.stringify(selected.event, null, 2) : '';

  return (
    <div {...rest} className={cx('elb-event-log', className)}>
      <div className="elb-event-log__bar">
        <span className="elb-event-log__title">Events</span>
        <span className="elb-event-log__count">{records.length}</span>
        {onClear && records.length > 0 && (
          <Button
            variant="secondary"
            className="elb-event-log__button elb-event-log__clear"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
      {selected === undefined || newest === undefined ? (
        <div className="elb-event-log__empty">
          <p className="elb-event-log__empty-title">No events yet</p>
          <p className="elb-event-log__empty-text">{emptyText}</p>
        </div>
      ) : (
        <div className="elb-event-log__body">
          <ul className="elb-event-log__list">
            {[...records].reverse().map(({ seq, event }) => {
              const time = timeOf(event.timestamp);
              return (
                <li key={seq}>
                  <button
                    type="button"
                    className="elb-event-log__row"
                    aria-pressed={seq === selected.seq}
                    disabled={!onSelect}
                    onClick={() => onSelect?.(seq === newest.seq ? null : seq)}
                  >
                    <span className="elb-event-log__seq">#{seq}</span>
                    <span className="elb-event-log__name">
                      <EventName event={event} />
                    </span>
                    {event.trigger && (
                      <InlineCode className="elb-event-log__trigger">
                        {event.trigger}
                      </InlineCode>
                    )}
                    {time && (
                      <time className="elb-event-log__time" dateTime={time.iso}>
                        {time.clock}
                      </time>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="elb-event-log__detail" data-theme="dark">
            <div className="elb-event-log__head">
              <div className="elb-event-log__summary">
                <span className="elb-event-log__detail-name">
                  <EventName event={selected.event} />
                </span>
                <span className="elb-event-log__meta">
                  {[
                    `#${selected.seq}`,
                    selected.event.trigger,
                    timeOf(selected.event.timestamp)?.clock,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <div
                className="elb-event-log__views"
                role="group"
                aria-label="View"
              >
                {VIEWS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className="elb-event-log__view"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                className="elb-event-log__button"
                onClick={() => copy(json)}
              >
                <Icon name={COPY[copyState].icon} size={12} />
                {COPY[copyState].label}
              </Button>
              <span className="elb-event-log__status" role="status">
                {copyState === 'idle' ? '' : COPY[copyState].label}
              </span>
            </div>
            {view === 'fields' ? (
              <Fields event={selected.event} />
            ) : (
              <Json text={json} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
