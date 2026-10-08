import { fireEvent, render } from '@testing-library/react';
import { elbish, LanguageProvider } from '.';
import { LanguageToggle } from '../molecules/LanguageToggle';
import { UserSwitch } from '../molecules/UserSwitch';
import { ConsentBar } from '../organisms/ConsentBar';

const noop = () => {};
const notice = 'Not sent: walkerOS is not running.';

// The way back and what went wrong stay readable: the language toggle's own
// labels, the persona names and system notices are never translated.
test('in Elbish, the controls and notices keep their English', () => {
  const { getByRole, getAllByRole, getByText } = render(
    <LanguageProvider language="elbish">
      <LanguageToggle language="elbish" onToggle={noop} />
      <UserSwitch persona="anonymous" onSwitch={noop} />
      <ConsentBar
        state="accepted"
        notice={notice}
        onAccept={noop}
        onDeny={noop}
        onReset={noop}
      />
    </LanguageProvider>,
  );

  // The page copy around them is in Elbish, so the provider is at work.
  expect(getByRole('button', { name: elbish('Accept') })).toBeTruthy();

  const toggle = getByRole('button', {
    name: 'Language: Elbish. Switch to English.',
  });
  expect(toggle.textContent).toBe('EnglishElbish');

  fireEvent.click(getByRole('button', { name: 'Demo user: Anonymous' }));
  expect(getByRole('menu', { name: 'Demo user' })).toBeTruthy();
  expect(getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual(
    ['Anonymous', 'Lisa Loyal', 'Sam Sales'],
  );

  expect(getByText(notice)).toBeTruthy();
});
