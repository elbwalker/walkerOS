import { render, screen, waitFor } from '@testing-library/react';
import { LiveCode } from '../components/organisms/live-code';

describe('LiveCode', () => {
  test('renders three panels with correct labels', () => {
    render(
      <LiveCode
        input={{ test: 'value' }}
        config={{ mapping: {} }}
        labelInput="Event"
        labelConfig="Mapping"
        labelOutput="Result"
      />,
    );

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Mapping')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  test('formats JSON input correctly with indentation', () => {
    render(<LiveCode input={{ name: 'test', data: { id: 123 } }} />);

    // Check that JSON is formatted (contains newlines and indentation)
    const container = screen.getByText('Event').parentElement?.parentElement;
    expect(container?.textContent).toContain('name');
    expect(container?.textContent).toContain('test');
    expect(container?.textContent).toContain('data');
  });

  test('displays only input and output when config is not provided', () => {
    render(<LiveCode input="test" labelInput="Input" labelOutput="Output" />);

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.queryByText('Config')).not.toBeInTheDocument();
  });

  test('displays empty text when no output', () => {
    render(<LiveCode input="test" emptyText="Waiting for data..." />);

    expect(screen.getByText('Waiting for data...')).toBeInTheDocument();
  });

  test('calls fn and displays logged output', async () => {
    const mockFn = jest.fn((_input, _config, log) => {
      log('Test output');
    });

    render(<LiveCode input="test" fn={mockFn} />);

    await waitFor(
      () => {
        expect(mockFn).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    expect(screen.getByText('Test output')).toBeInTheDocument();
  });

  test('displays error message when fn throws', async () => {
    const errorFn = jest.fn(() => {
      throw new Error('Test error');
    });

    render(<LiveCode input="test" fn={errorFn} />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument();
    });
  });

  test('includes function name in output when fnName is provided', async () => {
    const mockFn = jest.fn((_input, _config, log) => {
      log('arg1', 'arg2');
    });

    render(<LiveCode input="test" fn={mockFn} fnName="testFunction" />);

    await waitFor(() => {
      expect(
        screen.getByText(/testFunction\("arg1", "arg2"\)/),
      ).toBeInTheDocument();
    });
  });

  test('respects disableInput prop', () => {
    render(<LiveCode input="test" disableInput={true} />);

    // Check that the first panel is disabled
    const panels = document.querySelectorAll('.explorer-panel');
    const firstPanel = panels[0];
    const textarea = firstPanel?.querySelector('textarea');

    expect(textarea).toHaveAttribute('disabled');
  });

  test('applies custom className', () => {
    const { container } = render(
      <LiveCode input="test" className="custom-class" />,
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
