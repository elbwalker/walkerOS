import { fireEvent, render } from '@testing-library/react';
import { Dropdown } from './Dropdown';

const options = [
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'water', label: 'Water' },
];

const renderDropdown = (onChange: (value: string) => void = () => {}) =>
  render(
    <Dropdown
      value="coffee"
      options={options}
      onChange={onChange}
      label="Drink"
      icon="profile"
    />,
  );

test('the button names the choice and starts closed', () => {
  const { getByRole, queryByRole } = renderDropdown();
  const button = getByRole('button', { name: 'Drink: Coffee' });
  expect(button.getAttribute('aria-haspopup')).toBe('menu');
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(queryByRole('menu')).toBeNull();
});

test('opening shows every option, the current one checked and focused', () => {
  const { getByRole, getAllByRole } = renderDropdown();
  fireEvent.click(getByRole('button', { name: 'Drink: Coffee' }));

  expect(getByRole('menu', { name: 'Drink' })).toBeTruthy();
  const items = getAllByRole('menuitemradio');
  expect(items.map((item) => item.textContent)).toEqual([
    'Tea',
    'Coffee',
    'Water',
  ]);
  expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual([
    'false',
    'true',
    'false',
  ]);
  expect(items[1].ownerDocument.activeElement).toBe(items[1]);
});

test('arrow keys, Home and End move through the menu', () => {
  const { getByRole, getAllByRole } = renderDropdown();
  fireEvent.click(getByRole('button', { name: 'Drink: Coffee' }));
  const menu = getByRole('menu');
  const items = getAllByRole('menuitemradio');
  const focused = () =>
    items.findIndex((item) => item === menu.ownerDocument.activeElement);

  fireEvent.keyDown(menu, { key: 'ArrowDown' });
  expect(focused()).toBe(2);
  fireEvent.keyDown(menu, { key: 'ArrowDown' });
  expect(focused()).toBe(0);
  fireEvent.keyDown(menu, { key: 'End' });
  expect(focused()).toBe(2);
  fireEvent.keyDown(menu, { key: 'Home' });
  expect(focused()).toBe(0);
  fireEvent.keyDown(menu, { key: 'ArrowUp' });
  expect(focused()).toBe(2);
});

test('the arrow keys open it from the button', () => {
  const { getByRole } = renderDropdown();
  fireEvent.keyDown(getByRole('button', { name: 'Drink: Coffee' }), {
    key: 'ArrowDown',
  });
  expect(getByRole('menu')).toBeTruthy();
});

test('a press outside closes it without a choice', () => {
  const onChange = jest.fn();
  const { getByRole, queryByRole, container } = renderDropdown(onChange);
  fireEvent.click(getByRole('button', { name: 'Drink: Coffee' }));

  fireEvent.mouseDown(container.ownerDocument.body);

  expect(queryByRole('menu')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

test('choosing the current option closes it without a change', () => {
  const onChange = jest.fn();
  const { getByRole, queryByRole } = renderDropdown(onChange);
  const button = getByRole('button', { name: 'Drink: Coffee' });
  fireEvent.click(button);

  fireEvent.click(getByRole('menuitemradio', { name: 'Coffee' }));

  expect(queryByRole('menu')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
  expect(button.ownerDocument.activeElement).toBe(button);
});
