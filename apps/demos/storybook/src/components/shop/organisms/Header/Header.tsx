import { HeaderGlobals } from '../../molecules/HeaderGlobals';
import { NavLinks } from '../../molecules/NavLinks';
import { headerGlobals, navLinks, type NavLink } from '../../data';

export interface HeaderProps {
  links?: NavLink[];
  language?: string;
  languageLabel?: string;
  cartValue?: number;
}

export const Header = ({
  links = navLinks,
  language = headerGlobals.language,
  languageLabel = headerGlobals.languageLabel,
  cartValue = headerGlobals.cartValue,
}: HeaderProps) => (
  <header className="border-b border-border bg-bg">
    <nav
      aria-label="Top"
      className="mx-auto flex min-h-(--header-h) max-w-(--container) flex-wrap items-center justify-between gap-4 px-(--gutter)"
    >
      <NavLinks links={links} />
      <HeaderGlobals
        language={language}
        languageLabel={languageLabel}
        cartValue={cartValue}
      />
    </nav>
  </header>
);
