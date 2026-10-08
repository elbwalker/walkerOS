import { Dropdown } from '../Dropdown';
import {
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
  const { user } = personaFor(persona);

  return (
    <div {...(user ? { 'data-elbuser': userAttribute(user) } : {})}>
      <Dropdown
        value={persona}
        options={options}
        onChange={onSwitch}
        label="Demo user"
        icon="profile"
      />
    </div>
  );
};
