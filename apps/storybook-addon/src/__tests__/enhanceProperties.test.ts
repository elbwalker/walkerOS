import { enhanceProperties } from '../utils/domUtils';

const root = (html: string): HTMLElement => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('enhanceProperties', () => {
  test('marks elements with generic/explicit data attributes', () => {
    const r = root('<span data-elb-product="id:1"></span>');
    enhanceProperties(r, 'data-elb');
    expect(r.querySelector('span')!.hasAttribute('data-elbproperty')).toBe(
      true,
    );
  });

  test('marks elements with scoped data-elb_ attributes', () => {
    const r = root('<span data-elb_="currency:EUR"></span>');
    enhanceProperties(r, 'data-elb');
    expect(r.querySelector('span')!.hasAttribute('data-elbproperty')).toBe(
      true,
    );
  });

  test('does not mark command attributes (action/context/globals)', () => {
    const r = root('<span data-elbaction="click"></span>');
    enhanceProperties(r, 'data-elb');
    expect(r.querySelector('span')!.hasAttribute('data-elbproperty')).toBe(
      false,
    );
  });
});
