import React from 'react';
import { render } from '@testing-library/react';
import { QuickstartSteps } from '../QuickstartSteps';

const STEPS = [
  { title: 'Install', text: 'Add the script.' },
  { title: 'Tag', text: 'Name the entities.' },
  { title: 'Collect', text: 'Get the events.' },
];

describe('QuickstartSteps', () => {
  it('numbers each step with its title and text', () => {
    const { getAllByRole } = render(<QuickstartSteps steps={STEPS} />);
    const items = getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '1InstallAdd the script.',
      '2TagName the entities.',
      '3CollectGet the events.',
    ]);
    expect(
      getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toEqual(['Install', 'Tag', 'Collect']);
  });

  it('joins the steps with hidden arrows, a wave then a loop', () => {
    const { container } = render(<QuickstartSteps steps={STEPS} />);
    const list = container.querySelector('ol');
    expect(
      Array.from(list?.children ?? []).map((item) => item.className),
    ).toEqual([
      'elb-quickstart__step',
      'elb-quickstart__arrow elb-quickstart__arrow--wave',
      'elb-quickstart__step',
      'elb-quickstart__arrow elb-quickstart__arrow--loop',
      'elb-quickstart__step',
    ]);
    for (const arrow of container.querySelectorAll('.elb-quickstart__arrow'))
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
  });

  it('places the children after the steps', () => {
    const { getByText } = render(
      <QuickstartSteps steps={STEPS}>
        <a href="/docs">Guide</a>
      </QuickstartSteps>,
    );
    const link = getByText('Guide');
    expect(link.parentElement).toHaveClass('elb-quickstart');
    expect(link.previousElementSibling?.tagName).toBe('OL');
  });
});
