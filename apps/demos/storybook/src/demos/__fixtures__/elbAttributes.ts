import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Every `data-elb*` attribute a rendered page carries, as sorted
 * `name=value` strings: the page's tags, wherever they sit.
 */
export function elbAttributes(ui: ReactElement): string[] {
  const { container } = render(ui);
  const pairs: string[] = [];
  container.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes))
      if (attribute.name.startsWith('data-elb'))
        pairs.push(`${attribute.name}=${attribute.value}`);
  });
  return pairs.sort();
}
