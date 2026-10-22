// The page is going away: `pagehide` on unload and on entering the
// back-forward cache, and the document turning hidden, the last moment a
// mobile browser reliably runs code. Either may fire without the other, and
// both may fire for one departure.
export function watchPageHide(
  win: Window,
  doc: Document,
  onHide: () => void,
): () => void {
  const hidden = () => {
    if (doc.visibilityState === 'hidden') onHide();
  };

  win.addEventListener('pagehide', onHide);
  doc.addEventListener('visibilitychange', hidden);

  return () => {
    win.removeEventListener('pagehide', onHide);
    doc.removeEventListener('visibilitychange', hidden);
  };
}
