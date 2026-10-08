import { Link } from '../../atoms/Link';
import type { NavLink } from '../../data';

export interface NavLinksProps {
  links: NavLink[];
  className?: string;
}

export const NavLinks = ({ links, className = '' }: NavLinksProps) => (
  <div className={`flex flex-wrap items-center gap-x-8 gap-y-2 ${className}`}>
    {links.map((link) => (
      <Link key={link.href} href={link.href} className="text-ui">
        {link.label}
      </Link>
    ))}
  </div>
);
