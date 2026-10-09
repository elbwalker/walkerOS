import fixture from '../__fixtures__/media-attributes.json';
import { testControls } from '../__fixtures__/controls';
import { elbAttributes } from '../__fixtures__/elbAttributes';
import { MediaPage } from './pages/MediaPage';

// What the shared kit adds to a page that had neither before: the header's
// language global (LanguageToggle) and the footer's read action (Footer).
// Every other tag is the fixture's.
const fromSharedKit = [
  'data-elbaction=visible:read',
  'data-elbglobals=language:en',
];

// The tags the Media page carried before the shared-kit restructure, with the
// default controls. A failing test means a tag moved: fix the code, never the
// fixture.
test('the Media page keeps its tags', () => {
  expect(elbAttributes(<MediaPage controls={testControls()} />)).toEqual(
    [...fixture, ...fromSharedKit].sort(),
  );
});
