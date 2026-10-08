import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ToggleButton } from '../toggle-button';

const modes = [
  { label: 'Visual', value: 'visual' },
  { label: 'Code', value: 'code' },
];

function shownLabels(button: HTMLElement): string[] {
  return Array.from(
    button.querySelectorAll('.elb-explorer-toggle__label:not([aria-hidden])'),
  ).map((label) => label.textContent ?? '');
}

describe('ToggleButton', () => {
  it('shows only the option a click switches to, named by its label', () => {
    const { getByRole } = render(
      <ToggleButton options={modes} value="visual" onChange={() => {}} />,
    );

    const button = getByRole('button', { name: 'Code' });
    expect(shownLabels(button)).toEqual(['Code']);
  });

  it('keeps every label in the button, so its size never changes', () => {
    const { getByRole, rerender } = render(
      <ToggleButton options={modes} value="visual" onChange={() => {}} />,
    );
    const button = getByRole('button');
    const labels = () =>
      Array.from(button.querySelectorAll('.elb-explorer-toggle__label')).map(
        (label) => label.textContent,
      );

    expect(labels()).toEqual(['Visual', 'Code']);
    rerender(<ToggleButton options={modes} value="code" onChange={() => {}} />);
    expect(labels()).toEqual(['Visual', 'Code']);
    expect(shownLabels(button)).toEqual(['Visual']);
  });

  it('switches to the next option on a click, and from the last to the first', () => {
    const onChange = jest.fn();
    const { getByRole, rerender } = render(
      <ToggleButton options={modes} value="visual" onChange={onChange} />,
    );

    fireEvent.click(getByRole('button'));
    expect(onChange).toHaveBeenLastCalledWith('code');

    rerender(<ToggleButton options={modes} value="code" onChange={onChange} />);
    fireEvent.click(getByRole('button'));
    expect(onChange).toHaveBeenLastCalledWith('visual');
  });

  it('treats an unknown value as the first option', () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <ToggleButton options={modes} value="other" onChange={onChange} />,
    );

    expect(shownLabels(getByRole('button'))).toEqual(['Code']);
    fireEvent.click(getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('passes the action name and other attributes to the button', () => {
    const { getByRole } = render(
      <ToggleButton
        options={modes}
        value="visual"
        onChange={() => {}}
        aria-label="Show code"
        title="Show code"
        className="extra"
        data-testid="toggle"
      />,
    );

    const button = getByRole('button', { name: 'Show code' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('title', 'Show code');
    expect(button).toHaveAttribute('data-testid', 'toggle');
    expect(button).toHaveClass('elb-explorer-toggle', 'extra');
  });
});
