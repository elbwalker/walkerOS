import React, { type HTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../atoms/Icon';
import { cx } from '../cx';

export interface BrowserBookmark {
  label: string;
  url: string;
}

export interface BrowserFrameProps extends HTMLAttributes<HTMLDivElement> {
  /** Shown read-only in the address field. */
  url: string;
  /** A row of links under the address bar; the one whose `url` equals `url` is current. */
  bookmarks?: ReadonlyArray<BrowserBookmark>;
  /** Called with a bookmark's url on its click; without it the bookmarks are disabled. */
  onNavigate?: (url: string) => void;
  /** Adds a reload button. */
  onReload?: () => void;
  /** The caller's controls at the end of the address bar, after reload; a link or button there looks like reload. */
  actions?: ReactNode;
  /** The page: fills the viewport. An `iframe` takes its full size, borderless. */
  children: ReactNode;
}

/**
 * A browser window around a page, on the site theme. The caller sizes it: give
 * the root a height (and a width where it does not fill its parent) through
 * `className` or `style`; the viewport takes what the bars leave.
 */
export function BrowserFrame({
  url,
  bookmarks,
  onNavigate,
  onReload,
  actions,
  children,
  className,
  ...rest
}: BrowserFrameProps) {
  return (
    <div {...rest} className={cx('elb-browser', className)}>
      <div className="elb-browser__bar">
        <span className="elb-browser__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <div className="elb-browser__address" title={url}>
          <Icon name="lock" size={14} />
          <span className="elb-browser__url">{url}</span>
        </div>
        {onReload && (
          <button
            type="button"
            className="elb-browser__reload"
            aria-label="Reload"
            onClick={onReload}
          >
            <Icon name="reload" size={16} />
          </button>
        )}
        {actions && <div className="elb-browser__actions">{actions}</div>}
      </div>
      {bookmarks && bookmarks.length > 0 && (
        <nav className="elb-browser__bookmarks" aria-label="Bookmarks">
          {bookmarks.map((bookmark) => {
            const current = bookmark.url === url;
            return (
              <button
                key={bookmark.url}
                type="button"
                className={cx(
                  'elb-browser__bookmark',
                  current && 'elb-browser__bookmark--active',
                )}
                aria-current={current ? 'page' : undefined}
                disabled={!onNavigate}
                onClick={() => onNavigate?.(bookmark.url)}
              >
                <Icon name="bookmark" size={14} />
                <span>{bookmark.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      <div className="elb-browser__viewport">{children}</div>
    </div>
  );
}
