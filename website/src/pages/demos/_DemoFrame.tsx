import { useEffect, useState } from 'react';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {
  BrowserFrame,
  Button,
  Icon,
  type BrowserBookmark,
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

/** The demo site in a browser window; the bookmarks switch between demos. */
export function DemoFrame() {
  const bookmarks = useDemoBookmarks();
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

  return (
    <BrowserFrame
      url={url}
      bookmarks={bookmarks}
      onNavigate={setUrl}
      onReload={reload}
      className="h-[min(80vh,900px)] w-full"
    >
      {status === 'failed' ? (
        <FailedNotice onRetry={reload} />
      ) : (
        isBrowser && (
          <iframe
            key={`${url}#${attempt}`}
            src={demo.src}
            title="walkerOS demo"
            onLoad={() => setStatus('loaded')}
          />
        )
      )}
    </BrowserFrame>
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
