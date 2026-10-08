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

test('choosing a persona calls back with its key', () => {
  const onSwitch = jest.fn();
  const { getByRole } = render(
    <UserSwitch persona="anonymous" onSwitch={onSwitch} />,
  );
  fireEvent.change(getByRole('combobox'), { target: { value: 'sam' } });
  expect(onSwitch).toHaveBeenCalledWith('sam');
});
