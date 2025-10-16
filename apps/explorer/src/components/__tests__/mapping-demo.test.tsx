import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MappingDemo } from '../demos/MappingDemo';

describe('MappingDemo', () => {
  it('executes function and displays processed output', async () => {
    const fn = async (input: string, config: string) => {
      const data = JSON.parse(input);
      return JSON.stringify({ processed: data }, null, 2);
    };

    const initialInput = JSON.stringify({ test: 'value' }, null, 2);

    render(<MappingDemo input={initialInput} fn={fn} />);

    await waitFor(
      () => {
        const content = document.body.textContent;
        expect(content).toContain('processed');
      },
      { timeout: 1000 },
    );
  });
});
