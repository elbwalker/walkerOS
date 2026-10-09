import type { DemoControls } from '../../controls';
import { LanguageToggle } from '../../molecules/LanguageToggle';
import { UserSwitch } from '../../molecules/UserSwitch';

export interface HeaderControlsProps {
  controls: DemoControls;
}

/** The header's demo controls: language and demo user. */
export const HeaderControls = ({ controls }: HeaderControlsProps) => (
  <>
    <LanguageToggle
      language={controls.language}
      onToggle={controls.onLanguageToggle}
    />
    <UserSwitch
      persona={controls.persona}
      onSwitch={controls.onPersonaSwitch}
    />
  </>
);
