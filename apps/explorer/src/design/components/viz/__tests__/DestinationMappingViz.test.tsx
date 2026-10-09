import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DestinationMappingViz } from '../DestinationMappingViz';
import { MAPPING_CAPTION, MAPPING_EVENTS } from '../data/destination-mapping';
import { formatCall, formatElb, formatRule } from '../parts/format';

function texts(container: HTMLElement, selector: string): string[] {
  return Array.from(
    container.querySelectorAll(selector),
    (element) => element.textContent ?? '',
  );
}

describe('DestinationMappingViz', () => {
  it("starts on the first event and prints its elb() call, each destination's rule and calls", () => {
    const { container, getAllByRole } = render(<DestinationMappingViz />);
    const [first] = MAPPING_EVENTS;
    expect(
      getAllByRole('button').map((chip) => chip.getAttribute('aria-pressed')),
    ).toEqual(['true', 'false', 'false']);
    expect(
      container.querySelector('.elb-viz-mapping__event')?.textContent,
    ).toBe(formatElb(first));
    expect(texts(container, '.elb-viz-mapping__name')).toEqual([
      'GA4',
      'Meta Pixel',
      'TikTok Pixel',
      'Amplitude',
    ]);
    expect(texts(container, '.elb-viz-mapping__rule')).toEqual(
      first.destinations.map((destination) =>
        formatRule(first.entity, first.action, destination.rule),
      ),
    );
    expect(texts(container, '.elb-viz-mapping__line')).toEqual(
      first.destinations.flatMap((destination) =>
        destination.calls.flatMap((call) => formatCall(call)),
      ),
    );
  });

  it('switches the event on a chip', () => {
    const { container, getByRole } = render(<DestinationMappingViz />);
    fireEvent.click(getByRole('button', { name: 'order complete' }));
    expect(
      container.querySelector('.elb-viz-mapping__event')?.textContent,
    ).toBe(formatElb(MAPPING_EVENTS[2]));
    expect(texts(container, '.elb-viz-mapping__line')).toContain(
      'amplitude.revenue(new Revenue()',
    );
  });

  it('shows the page caption by default and none for an empty caption', () => {
    const { container, rerender } = render(<DestinationMappingViz />);
    expect(
      container.querySelector('.elb-viz-mapping__caption')?.textContent,
    ).toBe(MAPPING_CAPTION);
    rerender(<DestinationMappingViz caption="" />);
    expect(container.querySelector('.elb-viz-mapping__caption')).toBeNull();
  });
});
