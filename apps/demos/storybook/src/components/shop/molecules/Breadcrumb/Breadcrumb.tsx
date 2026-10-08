import type { HTMLAttributes } from 'react';
import { Icon } from '../../atoms/Icon';
import { Link } from '../../atoms/Link';

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: string[];
}

export const Breadcrumb = ({ items, ...rest }: BreadcrumbProps) => (
  <nav aria-label="Breadcrumb" {...rest}>
    <ol className="flex items-center gap-2">
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-2">
          <Link className="text-small font-medium">{item}</Link>
          {index < items.length - 1 && (
            <Icon name="slash" className="size-5 text-fg-3" />
          )}
        </li>
      ))}
    </ol>
  </nav>
);
