import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import type { Language } from '../../language';
import { createTrackingProps } from '../../tagger';

export interface LanguageToggleProps {
  language: Language;
  onToggle: (next: Language) => void;
}

const languages: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'elbish', label: 'Elbish' },
];

/**
 * English or Elbish. Its root sends the page language as the `language`
 * global. Its own labels are never translated, so the way back always reads.
 */
export const LanguageToggle = ({ language, onToggle }: LanguageToggleProps) => (
  <div
    {...createTrackingProps({ globals: { language } })}
    role="group"
    aria-label="Language"
    className="flex items-center gap-1"
  >
    <Icon name="globe" className="mr-1 size-5 text-fg-2" />
    {languages.map(({ value, label }) => (
      <Button
        key={value}
        variant={value === language ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={value === language}
        onClick={() => onToggle(value)}
      >
        {label}
      </Button>
    ))}
  </div>
);
