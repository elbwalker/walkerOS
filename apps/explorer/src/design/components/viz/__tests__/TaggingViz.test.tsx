import React from 'react';
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { TaggingViz } from '../TaggingViz';
import { htmlTokens, type TaggingScript } from '../data/tagging';

const CARD: TaggingScript = {
  lines: [
    {
      id: 'root',
      tokens: htmlTokens('<div data-elb="product">'),
      typeFrom: 0,
      typeTo: 600,
    },
    {
      id: 'name',
      tokens: htmlTokens(
        '  <h3 data-elb-product="name:#innerText">Cotton Tee</h3>',
      ),
      typeFrom: 800,
      typeTo: 1400,
      lights: 'title',
    },
    {
      id: 'price',
      tokens: htmlTokens(
        '  <span data-elb-product="price:#innerText">25</span>',
      ),
      typeFrom: 1600,
      typeTo: 2200,
      lights: 'price',
    },
    {
      id: 'add',
      tokens: htmlTokens(
        '  <button data-elbaction="click:add">Add to cart</button>',
      ),
      typeFrom: 2400,
      typeTo: 3000,
      lights: 'add',
    },
    { id: 'end', tokens: htmlTokens('</div>'), typeFrom: 0, typeTo: 0 },
  ],
  card: {
    parts: [
      { id: 'title', text: 'Cotton Tee', role: 'title' },
      { id: 'price', text: '25', role: 'meta' },
      { id: 'add', text: 'Add to cart', role: 'action' },
    ],
  },
  events: [
    {
      name: 'product add',
      data: { id: 'tee', name: 'Cotton Tee', price: '25' },
      at: 4200,
    },
  ],
  click: { part: 'add', at: 4000 },
};

const litParts = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('.elb-viz-tagging__text [class*="--on"]'),
    (part) => part.textContent,
  );

afterEach(() => jest.restoreAllMocks());

describe('TaggingViz', () => {
  it.each([
    [0, []],
    [3000, ['Cotton Tee', '25', 'Add to cart']],
  ])('at %i ms lights the parts whose lines are typed', (t, parts) => {
    const { container } = render(<TaggingViz script={CARD} t={t} />);
    expect(litParts(container)).toEqual(parts);
  });

  it('shows the same markup for the same time', () => {
    expect(renderToString(<TaggingViz script={CARD} t={2300} />)).toBe(
      renderToString(<TaggingViz script={CARD} t={2300} />),
    );
  });

  it('puts the cursor on the clicked part', () => {
    const { container } = render(<TaggingViz script={CARD} t={4100} />);
    expect(
      container.querySelector('.elb-viz-tagging__cursor')?.parentElement
        ?.textContent,
    ).toBe('Add to cart');
  });

  it.each([
    ['without a file, no name', undefined, null],
    ['with a file, its name', 'index.html', 'index.html'],
  ])('the bar shows %s', (_name, file, shown) => {
    const { container } = render(
      <TaggingViz script={{ ...CARD, file }} t={0} />,
    );
    expect(
      container.querySelector('.elb-viz-tagging__file')?.textContent ?? null,
    ).toBe(shown);
  });

  it('holds the end state without a loop', () => {
    const { container } = render(<TaggingViz script={CARD} t={600000} />);
    const card = container.querySelector<HTMLElement>('.elb-viz-tagging__card');
    expect(card?.style.getPropertyValue('--elb-viz-card-opacity')).toBe('1');
    expect(card?.style.getPropertyValue('--elb-viz-card-offset')).toBe('0');
    expect(
      container
        .querySelector<HTMLElement>('.elb-viz-tagging__code')
        ?.style.getPropertyValue('--elb-viz-fade'),
    ).toBe('1');
    expect(litParts(container)).toEqual(['Cotton Tee', '25', 'Add to cart']);
    expect(
      container.querySelectorAll('.elb-viz-table__row--event'),
    ).toHaveLength(1);
  });

  it('names a line that lights a missing part, once', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const script: TaggingScript = {
      ...CARD,
      lines: [{ ...CARD.lines[1], id: 'heading', lights: 'headline' }],
    };
    render(<TaggingViz script={script} t={0} />);
    render(<TaggingViz script={script} t={100} />);
    expect(error.mock.calls).toEqual([
      [
        'TaggingViz: line "heading" lights part "headline", which the card does not have.',
      ],
    ]);
  });
});
