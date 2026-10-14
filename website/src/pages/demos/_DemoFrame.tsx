import { useCallback, useEffect, useRef, useState } from 'react';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import useIsBrowser from '@docusaurus/useIsBrowser';
import type { WalkerOS } from '@walkeros/core';
import {
  BrowserFrame,
  Button,
  EventLog,
  Icon,
  type BrowserBookmark,
  type EventLogRecord,
} from '@walkeros/explorer/design/components';

/** The demo pages: static files the website build copies in, not routes. */
const demos = [
  { label: 'Shop', path: '/demos/shop/' },
  { label: 'Media', path: '/demos/media/' },
];

interface DemoBookmark extends BrowserBookmark {
  /** The same-origin path the iframe loads, under the site's base URL. */
  src: string;
}

/** Each demo's absolute address for the address field, and its path for the iframe. */
function useDemoBookmarks(): DemoBookmark[] {
  const { withBaseUrl } = useBaseUrlUtils();
  return demos.map(({ label, path }) => ({
    label,
    url: withBaseUrl(path, { absolute: true }),
    src: withBaseUrl(path),
  }));
}

/** Without a `load` within this time, the frame says the demo didn't load. */
const LOAD_TIMEOUT_MS = 10_000;

type Status = 'loading' | 'loaded' | 'failed';

/** The log keeps this many events, the newest. */
const LOG_CAP = 200;

/**
 * The published Tag Mode script the walkerOS icon loads into the demo page.
 * `file` is the base64url sha384 of its bytes, so it is its integrity value
 * too; while it is empty the icon is left out. The script shows a
 * demonstration only on `origins`, and does nothing anywhere else.
 */
const TAG_MODE = {
  // The stage copy. Before a release only `base` changes, to
  // https://cdn.walkeros.io/tag-mode/: production runs the build stage ran,
  // so the file keeps its name there.
  file: 'SPwvtoe6zx3P8I5OGG4g4CNWmgdQzHHL-E_-TbzmJOiIp80CngpYbz5pKOhSn9FL',
  base: 'https://stage.cdn.walkeros.io/tag-mode/',
  origins: ['https://www.walkeros.io', 'https://walkeros.io'],
};

/**
 * Adds the Tag Mode script to the demo page, asking for a demonstration: Tag
 * Mode with no app behind it, where nothing is sent and nothing is kept. The
 * tag is made by the page's own document, since the script reads its own tag
 * there. `onError` runs when the script cannot be loaded.
 */
function loadTagMode(frame: HTMLIFrameElement, onError: () => void): void {
  const page = frame.contentDocument;
  if (!page) {
    onError();
    return;
  }
  const script = page.createElement('script');
  script.src = `${TAG_MODE.base}${TAG_MODE.file}.js`;
  script.integrity = `sha384-${TAG_MODE.file.replace(/-/g, '+').replace(/_/g, '/')}`;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-elb-demo', '');
  script.addEventListener('error', onError);
  page.head.appendChild(script);
}

/**
 * Adds a destination to the demo page's own walkerOS that hands every event to
 * `onEvent`; the collector first replays to it the events the page sent before.
 * The demo page shares this site's origin, so its `elb` is in reach: the queue
 * until walker.js runs, its push after. False when the page has no `elb`.
 */
function readEvents(
  frame: HTMLIFrameElement,
  onEvent: (event: WalkerOS.Event) => void,
): boolean {
  const elb = frame.contentWindow?.elb;
  if (typeof elb !== 'function') return false;
  void elb('walker destination', {
    code: {
      type: 'demos-page',
      config: {},
      // A copy: the log outlives the page the event object belongs to.
      push: (event: WalkerOS.Event) => {
        onEvent(structuredClone(event));
      },
    },
  });
  return true;
}

/**
 * The demo site in a browser window, with the events it sends listed below;
 * the bookmarks switch between demos, and the walkerOS icon opens Tag Mode on
 * the page, as the browser extension's icon does.
 */
export function DemoFrame() {
  const bookmarks = useDemoBookmarks();
  const { withBaseUrl } = useBaseUrlUtils();
  const [url, setUrl] = useState(bookmarks[0].url);
  const demo =
    bookmarks.find((bookmark) => bookmark.url === url) ?? bookmarks[0];
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  // The iframe exists only in the browser: a pre-rendered one can finish
  // loading before hydration attaches `onLoad`, and the timer would then fail it.
  const isBrowser = useIsBrowser();

  useEffect(() => {
    if (!isBrowser) return;
    setStatus('loading');
    const timer = window.setTimeout(
      () =>
        setStatus((current) => (current === 'loading' ? 'failed' : current)),
      LOAD_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isBrowser, url, attempt]);

  const reload = () => setAttempt((n) => n + 1);

  // The log lives through reloads and demo switches, until Clear.
  const [records, setRecords] = useState<EventLogRecord[]>([]);
  // Null follows the newest event.
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [readable, setReadable] = useState(true);
  const lastSeq = useRef(0);

  const record = useCallback((event: WalkerOS.Event) => {
    lastSeq.current += 1;
    const next: EventLogRecord = { seq: lastSeq.current, event };
    setRecords((current) => [...current, next].slice(-LOG_CAP));
  }, []);

  const clear = () => {
    lastSeq.current = 0;
    setRecords([]);
    setSelectedSeq(null);
  };

  const frame = useRef<HTMLIFrameElement>(null);
  const [tagMode, setTagMode] = useState(false);
  const [tagModeFailed, setTagModeFailed] = useState(false);
  const offersTagMode =
    isBrowser &&
    TAG_MODE.file !== '' &&
    TAG_MODE.origins.includes(window.location.origin);
  const failTagMode = () => setTagModeFailed(true);

  const toggleTagMode = () => {
    setTagModeFailed(false);
    if (tagMode) {
      // Tag Mode lives in the page: a fresh page ends it.
      setTagMode(false);
      reload();
      return;
    }
    setTagMode(true);
    if (frame.current) loadTagMode(frame.current, failTagMode);
  };

  return (
    <div className="flex flex-col gap-4">
      <BrowserFrame
        url={url}
        bookmarks={bookmarks}
        onNavigate={setUrl}
        onReload={reload}
        actions={
          offersTagMode && (
            <button
              type="button"
              aria-pressed={tagMode}
              title={tagMode ? 'Close Tag Mode' : 'Open Tag Mode'}
              className={tagMode ? 'bg-surface-2' : undefined}
              onClick={toggleTagMode}
            >
              <img
                src={withBaseUrl('/img/favicon.png')}
                alt="Tag Mode"
                width={16}
                height={16}
              />
            </button>
          )
        }
        // At least 640px: Tag Mode's tray has to fit below the two bars.
        className="h-[clamp(640px,70vh,800px)] w-full"
      >
        {status === 'failed' ? (
          <FailedNotice onRetry={reload} />
        ) : (
          isBrowser && (
            <iframe
              ref={frame}
              key={`${url}#${attempt}`}
              src={demo.src}
              title="walkerOS demo"
              // Fires for every page the frame loads, a persona switch too.
              onLoad={(event) => {
                setStatus('loaded');
                setReadable(readEvents(event.currentTarget, record));
                // A new page starts without Tag Mode: add it again while on.
                if (tagMode) loadTagMode(event.currentTarget, failTagMode);
              }}
            />
          )
        )}
      </BrowserFrame>
      {tagModeFailed && (
        <p
          role="alert"
          className="m-0 flex items-center gap-2 text-ui text-fg-2"
        >
          <Icon name="warning" size={16} className="text-warning" />
          Tag Mode could not be loaded.
        </p>
      )}
      <EventLog
        records={records}
        selectedSeq={selectedSeq}
        onSelect={setSelectedSeq}
        onClear={clear}
        emptyText={readable ? undefined : "The demo's events can't be read."}
        className="h-[min(40vh,480px)] w-full"
      />
    </div>
  );
}

function FailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <p className="m-0 flex items-center gap-2 text-title-item text-fg">
        <Icon name="warning" size={20} className="text-warning" />
        The demo didn't load.
      </p>
      <Button variant="secondary" onClick={onRetry}>
        <Icon name="reload" size={16} />
        Retry
      </Button>
    </div>
  );
}
