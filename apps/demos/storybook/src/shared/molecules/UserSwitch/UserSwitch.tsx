import { useId } from 'react';
import { Icon } from '../../atoms/Icon';
import { Select } from '../../atoms/Select';
import {
  isPersonaKey,
  personaFor,
  personas,
  userAttribute,
  type PersonaKey,
} from '../../personas';

export interface UserSwitchProps {
  persona: PersonaKey;
  onSwitch: (key: PersonaKey) => void;
}

const options = personas.map(({ key, label }) => ({ value: key, label }));

/**
 * Picks the demo user. Its root tags the persona's user (`data-elbuser`), so
 * the browser source sets it before the page view; Anonymous tags none. The
 * names are never translated, so the way back always reads.
 */
export const UserSwitch = ({ persona, onSwitch }: UserSwitchProps) => {
  const id = useId();
  const { user } = personaFor(persona);

  return (
    <div
      {...(user ? { 'data-elbuser': userAttribute(user) } : {})}
      className="flex items-center gap-2"
    >
      <Icon name="profile" className="size-5 text-fg-2" />
      <label htmlFor={id} className="sr-only">
        Demo user
      </label>
      <Select
        id={id}
        value={persona}
        options={options}
        className="w-auto"
        onChange={(event) => {
          const key = event.target.value;
          if (isPersonaKey(key)) onSwitch(key);
        }}
      />
    </div>
  );
};
