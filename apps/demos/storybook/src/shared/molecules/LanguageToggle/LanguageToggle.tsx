import { ToggleButton } from '@walkeros/explorer';
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
 * English or Elbish, as one button like the source view's Code/Visual
 * switch: it shows the current language, a click switches. Its root sends
 * the page language as the `language` global. Its labels are never
 * translated, so the way back always reads.
 */
export const LanguageToggle = ({ language, onToggle }: LanguageToggleProps) => {
  const current = languages.find((option) => option.value === language);
  const next = languages.find((option) => option.value !== language);

  return (
    <div
      {...createTrackingProps({ globals: { language } })}
      className="inline-flex items-center gap-2"
    >
      <Icon name="globe" className="size-5 text-fg-2" />
      <ToggleButton
        options={languages}
        value={language}
        shows="current"
        aria-label={`Language: ${current?.label}. Switch to ${next?.label}.`}
        onChange={(value) => {
          const chosen = languages.find((option) => option.value === value);
          if (chosen) onToggle(chosen.value);
        }}
      />
    </div>
  );
};
