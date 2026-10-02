type HistoryMethod = History['pushState'];

// A route change is a new path or query for push and back/forward, and a new
// path for replace: filters and search boxes rewrite the query with
// replaceState. Hash-only changes never count.
export function watchHistory(
  win: Window,
  onChange: (href: string) => void,
): () => void {
  const history = win.history;
  const originalPush: HistoryMethod = history.pushState;
  const originalReplace: HistoryMethod = history.replaceState;
  let path = win.location.pathname;
  let search = win.location.search;
  // A wrapper installed over ours keeps calling it after unsubscribe.
  let active = true;

  const check = (isReplace: boolean) => {
    if (!active) return;
    const { pathname, search: nextSearch, href } = win.location;
    const changed = pathname !== path || (!isReplace && nextSearch !== search);
    // Compare against the URL right before this change, counted or not.
    path = pathname;
    search = nextSearch;
    if (changed) onChange(href);
  };

  const push: HistoryMethod = function (...args) {
    originalPush.apply(history, args);
    check(false);
  };
  const replace: HistoryMethod = function (...args) {
    originalReplace.apply(history, args);
    check(true);
  };
  const pop = () => check(false);

  history.pushState = push;
  history.replaceState = replace;
  // Capture runs before any router's own popstate listener.
  win.addEventListener('popstate', pop, { capture: true });

  return () => {
    active = false;
    // Another script may have wrapped ours since: leave its wrapper in place.
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace)
      history.replaceState = originalReplace;
    win.removeEventListener('popstate', pop, { capture: true });
  };
}
