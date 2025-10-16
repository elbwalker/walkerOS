import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { DestinationDemo } from '../demos/DestinationDemo';
import type { Destination, WalkerOS } from '@walkeros/core';

describe('DestinationDemo', () => {
  const mockDestination: Destination.Instance = {
    type: 'test-destination',
    config: {},
    push: async () => {},
  };

  const testEvent: WalkerOS.PartialEvent = {
    event: 'product',
    data: { id: 'test-123', price: 99 },
  };

  it('executes destination function and displays captured output', async () => {
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
});
