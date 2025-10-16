import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MappingDemo } from '../demos/MappingDemo';

describe('MappingDemo rendering', () => {
  it('renders input, config, and output panels', () => {
    const fn = async (input: string, config: string) => {
      return JSON.stringify({ result: 'processed' }, null, 2);
    };

    render(<MappingDemo fn={fn} />);

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('executes function and displays output', async () => {
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

  it('renders with custom labels', () => {
    const fn = async () => '{}';

    render(
      <MappingDemo
        labelInput="Custom Input"
        labelConfig="Custom Config"
        labelOutput="Custom Output"
        fn={fn}
      />,
    );

    expect(screen.getByText('Custom Input')).toBeInTheDocument();
    expect(screen.getByText('Custom Config')).toBeInTheDocument();
    expect(screen.getByText('Custom Output')).toBeInTheDocument();
  });
});
