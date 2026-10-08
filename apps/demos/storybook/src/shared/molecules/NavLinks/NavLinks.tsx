import { Link } from '../../atoms/Link';
import { useText } from '../../language';

/** A navigation link: its label and the page section it scrolls to. */
export interface NavLink {
  label: string;
  href: string;
}

export interface NavLinksProps {
  links: NavLink[];
  className?: string;
}

export const NavLinks = ({ links, className = '' }: NavLinksProps) => {
  const t = useText();
  return (
    <div className={`flex flex-wrap items-center gap-x-8 gap-y-2 ${className}`}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-ui">
          {t(link.label)}
        </Link>
      ))}
    </div>
  );
};
