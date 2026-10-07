import React, { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { CodeLine, CodeTokens } from '../parts/CodeTokens';
import { EventsTable } from '../parts/EventsTable';
import { useInView, useReducedMotion } from '../parts/hooks';
import { Pill } from '../parts/Pill';
import { vizStyle } from '../parts/style';
import { Thumb } from '../parts/Thumb';
import { clamp, ease } from '../parts/timeline';
import { lineText, tok, truncate, typedLength } from '../parts/tokens';
import { VizFrame } from '../parts/VizFrame';
import { observeAs, preferReducedMotion } from './browser';

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.35);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      data-in-view={String(inView)}
      data-reduced={String(reduced)}
    />
  );
}

describe('tokens', () => {
  const tokens = [
    tok('data-elb', 'attr'),
    tok('=', 'punct'),
    tok('"article"', 'str'),
  ];

  it('types a prefix of the text, keeping each token kind', () => {
    expect(typedLength(tokens)).toBe(18);
    expect(lineText(truncate(tokens, 10))).toBe('data-elb="');
    expect(truncate(tokens, 10).map((token) => token.kind)).toEqual([
      'attr',
      'punct',
      'str',
    ]);
    expect(truncate(tokens, 0)).toEqual([]);
    expect(tok('x', 'attr', 'entity')).toEqual({
      t: 'x',
      kind: 'attr',
      mark: 'entity',
    });
  });
});

describe('timeline', () => {
  it('clamps to [0, 1] and eases symmetrically', () => {
    expect([clamp(-1), clamp(0.4), clamp(2)]).toEqual([0, 0.4, 1]);
    expect([ease(0), ease(0.5), ease(1)]).toEqual([0, 0.5, 1]);
  });
});

describe('vizStyle', () => {
  it('sets per-frame values as custom properties', () => {
    const { container } = render(
      <div
        style={vizStyle({
          '--elb-viz-fade': 0.5,
          '--elb-viz-card-offset': -12,
        })}
      />,
    );
    const style = container.firstElementChild?.getAttribute('style');
    expect(style).toContain('--elb-viz-fade: 0.5');
    expect(style).toContain('--elb-viz-card-offset: -12');
  });
});

describe('hooks', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
    Reflect.deleteProperty(window, 'IntersectionObserver');
  });

  it('report false on the server', () => {
    expect(renderToString(<Probe />)).toContain(
      'data-in-view="false" data-reduced="false"',
    );
  });

  it('report in view without IntersectionObserver, and no reduced motion without matchMedia', () => {
    const { container } = render(<Probe />);
    expect(container.firstElementChild?.getAttribute('data-in-view')).toBe(
      'true',
    );
    expect(container.firstElementChild?.getAttribute('data-reduced')).toBe(
      'false',
    );
  });

  it('report in view only from the threshold on', () => {
    const below = observeAs(true, 0.1);
    const hidden = render(<Probe />);
    expect(below).toEqual([{ threshold: 0.35 }]);
    expect(
      hidden.container.firstElementChild?.getAttribute('data-in-view'),
    ).toBe('false');
    hidden.unmount();
    observeAs(true, 0.35);
    const shown = render(<Probe />);
    expect(
      shown.container.firstElementChild?.getAttribute('data-in-view'),
    ).toBe('true');
  });

  it('read prefers-reduced-motion', () => {
    preferReducedMotion();
    const { container } = render(<Probe />);
    expect(container.firstElementChild?.getAttribute('data-reduced')).toBe(
      'true',
    );
  });
});

describe('VizFrame', () => {
  it('is a dark island whatever the caller passes', () => {
    const { container } = render(
      <VizFrame variant="mapping" data-theme="light" aria-label="Demo">
        Body
      </VizFrame>,
    );
    const root = container.firstElementChild;
    expect(root?.getAttribute('data-theme')).toBe('dark');
    expect(root?.getAttribute('class')).toBe('elb-viz elb-viz--mapping');
    expect(root?.getAttribute('aria-label')).toBe('Demo');
    expect(root?.firstElementChild?.getAttribute('class')).toBe(
      'elb-viz__body',
    );
  });
});

describe('CodeTokens and CodeLine', () => {
  it('colours each token by kind and tints a marked token only when active', () => {
    const tokens = [tok('data-elb', 'attr', 'entity'), tok('=', 'punct')];
    const { container, rerender } = render(<CodeTokens tokens={tokens} />);
    expect(Array.from(container.children, (child) => child.className)).toEqual([
      'elb-viz-tok elb-viz-tok--attr',
      'elb-viz-tok elb-viz-tok--punct',
    ]);
    rerender(<CodeTokens tokens={tokens} active />);
    expect(container.firstElementChild?.className).toBe(
      'elb-viz-tok elb-viz-tok--attr elb-viz-tok--mark-entity',
    );
  });

  it('draws a numbered line with a coloured bar', () => {
    const { container } = render(
      <CodeLine number={3} bar="context">
        code
      </CodeLine>,
    );
    expect(container.querySelector('.elb-viz-line__bar')).toHaveClass(
      'elb-viz-line__bar--context',
    );
    expect(container.querySelector('.elb-viz-line__number')?.textContent).toBe(
      '3',
    );
  });
});

describe('Pill', () => {
  it('fills with its event part, or outlines it', () => {
    const { container } = render(
      <>
        <Pill part="entity">article</Pill>
        <Pill part="property" variant="outline">
          1
        </Pill>
      </>,
    );
    expect(Array.from(container.children, (child) => child.className)).toEqual([
      'elb-viz-pill elb-viz-pill--entity',
      'elb-viz-pill elb-viz-pill--property elb-viz-pill--outline',
    ]);
  });
});

describe('Thumb', () => {
  it.each<['bug' | 'tech' | 'food']>([['bug'], ['tech'], ['food']])(
    'paints %s from classes, with no fill or stroke attribute',
    (kind) => {
      const { container } = render(<Thumb kind={kind} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('elb-viz-thumb', `elb-viz-thumb--${kind}`);
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(container.querySelectorAll('[fill], [stroke]')).toHaveLength(0);
    },
  );
});

describe('EventsTable', () => {
  it('prints each row as JSON and pads with skeleton rows to six', () => {
    const { container } = render(
      <EventsTable
        rows={[
          {
            key: '0-open',
            name: 'article open',
            data: { category: 'Tech', title: 'Return of the Bug' },
            age: 1000,
          },
        ]}
      />,
    );
    const row = container.querySelector('.elb-viz-table__row--event');
    expect(row?.querySelector('.elb-viz-table__json')?.textContent).toBe(
      JSON.stringify({ category: 'Tech', title: 'Return of the Bug' }),
    );
    expect(row?.getAttribute('style')).toContain('--elb-viz-row-opacity: 1');
    expect(
      container.querySelectorAll('.elb-viz-table__row--skeleton'),
    ).toHaveLength(5);
  });
});
