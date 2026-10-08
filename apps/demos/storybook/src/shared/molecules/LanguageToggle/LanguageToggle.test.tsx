import { fireEvent, render } from '@testing-library/react';
import { LanguageToggle } from './LanguageToggle';

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

test('the pressed button names the language, in English either way', () => {
  const { getByRole } = render(
    <LanguageToggle language="elbish" onToggle={() => {}} />,
  );
  expect(
    getByRole('button', { name: 'English' }).getAttribute('aria-pressed'),
  ).toBe('false');
  expect(
    getByRole('button', { name: 'Elbish' }).getAttribute('aria-pressed'),
  ).toBe('true');
});

test('a click calls back with the language', () => {
  const onToggle = jest.fn();
  const { getByRole } = render(
    <LanguageToggle language="en" onToggle={onToggle} />,
  );
  fireEvent.click(getByRole('button', { name: 'Elbish' }));
  expect(onToggle).toHaveBeenCalledWith('elbish');
});
