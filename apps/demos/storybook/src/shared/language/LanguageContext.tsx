import { createContext, useContext, type ReactNode } from 'react';
import { elbish, type Language } from './elbish';

const LanguageContext = createContext<Language>('en');

export interface LanguageProviderProps {
  language: Language;
  children: ReactNode;
}

/** Sets the language every `useText()` below it shows. */
export function LanguageProvider({
  language,
  children,
}: LanguageProviderProps) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

/** The current language; English without a provider. */
export function useLanguage(): Language {
  return useContext(LanguageContext);
}

const asIs = (text: string): string => text;

/**
 * The text function for visible text: the identity in English, `elbish()` in
 * Elbish. One function per language, so it is stable across renders. Never
 * for a `data-elb*` value: tags stay English.
 */
export function useText(): (text: string) => string {
  return useLanguage() === 'elbish' ? elbish : asIs;
}
