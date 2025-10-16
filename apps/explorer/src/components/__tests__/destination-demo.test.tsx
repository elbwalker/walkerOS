import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DestinationDemo } from '../demos/DestinationDemo';
import type { Destination, WalkerOS } from '@walkeros/core';

describe('DestinationDemo rendering', () => {
  const mockDestination: Destination.Instance = {
    type: 'test-destination',
    config: {},
    push: async () => {},
  };

  const testEvent: WalkerOS.PartialEvent = {
    event: 'product',
    data: { id: 'test-123', price: 99 },
  };

  it('renders event, mapping, and result panels', () => {
    render(<DestinationDemo destination={mockDestination} event={testEvent} />);

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Mapping')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('executes destination function and displays output', async () => {
    const captureFn = async (event: WalkerOS.Event) => {
      return JSON.stringify({ event: event.event, captured: true }, null, 2);
    };

    render(
      <DestinationDemo
        destination={mockDestination}
        event={testEvent}
        fn={captureFn}
      />,
    );

    await waitFor(
      () => {
        const content = document.body.textContent;
        expect(content).toContain('captured');
      },
      { timeout: 1000 },
    );
  });

  it('renders with custom labels', () => {
    render(
      <DestinationDemo
        destination={mockDestination}
        event={testEvent}
        labelEvent="Custom Event"
        labelMapping="Custom Mapping"
        labelOutput="Custom Output"
      />,
    );

    expect(screen.getByText('Custom Event')).toBeInTheDocument();
    expect(screen.getByText('Custom Mapping')).toBeInTheDocument();
    expect(screen.getByText('Custom Output')).toBeInTheDocument();
  });
});
