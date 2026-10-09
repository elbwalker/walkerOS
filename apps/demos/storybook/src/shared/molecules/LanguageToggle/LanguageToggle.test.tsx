import { fireEvent, render } from '@testing-library/react';
import { LanguageToggle } from './LanguageToggle';

const shownLabel = (button: HTMLElement) =>
  Array.from(
    button.querySelectorAll('.elb-explorer-toggle__label:not([aria-hidden])'),
    (label) => label.textContent,
  );

test('the root carries the language global', () => {
  const noop = () => {};
  const { container, rerender } = render(
    <LanguageToggle language="en" onToggle={noop} />,
  );
  const globals = () =>
    Array.from(container.querySelectorAll('[data-elbglobals]'), (element) =>
      element.getAttribute('data-elbglobals'),
    );
  expect(globals()).toEqual(['language:en']);

  rerender(<LanguageToggle language="elbish" onToggle={noop} />);
  expect(globals()).toEqual(['language:elbish']);
});

test('English shows English, and a click switches to Elbish', () => {
  const onToggle = jest.fn();
  const { getByRole } = render(
    <LanguageToggle language="en" onToggle={onToggle} />,
  );
  const button = getByRole('button', {
    name: 'Language: English. Switch to Elbish.',
  });

  expect(shownLabel(button)).toEqual(['English']);
  fireEvent.click(button);
  expect(onToggle).toHaveBeenCalledWith('elbish');
});

test('Elbish shows Elbish, and a click switches to English', () => {
  const onToggle = jest.fn();
  const { getByRole } = render(
    <LanguageToggle language="elbish" onToggle={onToggle} />,
  );
  const button = getByRole('button', {
    name: 'Language: Elbish. Switch to English.',
  });

  expect(shownLabel(button)).toEqual(['Elbish']);
  fireEvent.click(button);
  expect(onToggle).toHaveBeenCalledWith('en');
});
