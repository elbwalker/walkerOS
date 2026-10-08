import { render } from '@testing-library/react';
import { LanguageProvider, useLanguage, useText } from './LanguageContext';

const Probe = () => {
  const t = useText();
  return <p data-language={useLanguage()}>{t('Add to cart')}</p>;
};

describe('LanguageContext', () => {
  test('English shows the text as it is', () => {
    const { container } = render(
      <LanguageProvider language="en">
        <Probe />
      </LanguageProvider>,
    );
    expect(container.textContent).toBe('Add to cart');
  });

  test('Elbish shows the text in Elbish', () => {
    const { container } = render(
      <LanguageProvider language="elbish">
        <Probe />
      </LanguageProvider>,
    );
    expect(container.textContent).toBe('Eff vu desv');
    expect(container.querySelector('p')?.dataset.language).toBe('elbish');
  });

  test('without a provider the text function is the identity, in English', () => {
    const { container } = render(<Probe />);
    expect(container.textContent).toBe('Add to cart');
    expect(container.querySelector('p')?.dataset.language).toBe('en');
  });

  test('the text function stays the same while the language does', () => {
    const seen: Array<(text: string) => string> = [];
    const Collect = () => {
      seen.push(useText());
      return null;
    };
    const { rerender } = render(
      <LanguageProvider language="elbish">
        <Collect />
      </LanguageProvider>,
    );
    rerender(
      <LanguageProvider language="elbish">
        <Collect />
      </LanguageProvider>,
    );
    rerender(
      <LanguageProvider language="en">
        <Collect />
      </LanguageProvider>,
    );
    expect(seen[0]).toBe(seen[1]);
    expect(seen[2]).not.toBe(seen[1]);
  });
});
