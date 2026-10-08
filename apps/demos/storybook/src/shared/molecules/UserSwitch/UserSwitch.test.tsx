import { fireEvent, render } from '@testing-library/react';
import type { PersonaKey } from '../../personas';
import { UserSwitch } from './UserSwitch';

const noop = () => {};

test('Anonymous tags no user', () => {
  const { container } = render(
    <UserSwitch persona="anonymous" onSwitch={noop} />,
  );
  expect(container.querySelector('[data-elbuser]')).toBeNull();
});

const tagged: Array<[PersonaKey, string]> = [
  ['lisa', 'id:lisa-loyal;email:lisa@example.com;segment:vip'],
  ['sam', 'id:sam-sales;email:sam@example.com'],
];

test.each(tagged)('%s tags their user', (persona, user) => {
  const { container } = render(
    <UserSwitch persona={persona} onSwitch={noop} />,
  );
  const elements = container.querySelectorAll('[data-elbuser]');
  expect(elements).toHaveLength(1);
  expect(elements[0].getAttribute('data-elbuser')).toBe(user);
});

test('opens a menu of the personas, the current one checked', () => {
  const { getByRole, getAllByRole } = render(
    <UserSwitch persona="lisa" onSwitch={noop} />,
  );
  const button = getByRole('button', { name: 'Demo user: Lisa Loyal' });
  expect(button.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(button);

  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(
    getAllByRole('menuitemradio').map((item) => [
      item.textContent,
      item.getAttribute('aria-checked'),
    ]),
  ).toEqual([
    ['Anonymous', 'false'],
    ['Lisa Loyal', 'true'],
    ['Sam Sales', 'false'],
  ]);
});

test('a choice calls back with its key and closes the menu', () => {
  const onSwitch = jest.fn();
  const { getByRole, queryByRole } = render(
    <UserSwitch persona="anonymous" onSwitch={onSwitch} />,
  );
  fireEvent.click(getByRole('button', { name: 'Demo user: Anonymous' }));

  fireEvent.click(getByRole('menuitemradio', { name: 'Sam Sales' }));

  expect(onSwitch).toHaveBeenCalledWith('sam');
  expect(queryByRole('menu')).toBeNull();
});

test('Escape closes the menu and returns to the button', () => {
  const onSwitch = jest.fn();
  const { getByRole, queryByRole } = render(
    <UserSwitch persona="anonymous" onSwitch={onSwitch} />,
  );
  const button = getByRole('button', { name: 'Demo user: Anonymous' });
  fireEvent.click(button);

  fireEvent.keyDown(getByRole('menu'), { key: 'Escape' });

  expect(queryByRole('menu')).toBeNull();
  expect(button.ownerDocument.activeElement).toBe(button);
  expect(onSwitch).not.toHaveBeenCalled();
});
