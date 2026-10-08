import type { ReactNode } from 'react';
import { useText } from '../../language';
import { NavLinks, type NavLink } from '../../molecules/NavLinks';

export interface HeaderProps {
  brand?: ReactNode;
  /** Anchors of the one-pager's sections, `#section`. */
  links: NavLink[];
  /** The demo controls: LanguageToggle and UserSwitch. */
  controls: ReactNode;
  /** A demo's own items: Shop's cart, Media's search. */
  extras?: ReactNode;
}

export const Header = ({ brand, links, controls, extras }: HeaderProps) => {
  const t = useText();
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex min-h-(--header-h) max-w-(--container) flex-wrap items-center justify-between gap-4 px-(--gutter)">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {brand}
          <nav aria-label={t('Top')}>
            <NavLinks links={links} />
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {controls}
          {extras}
        </div>
      </div>
    </header>
  );
};
