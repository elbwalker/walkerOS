import fixture from '../__fixtures__/shop-attributes.json';
import { testControls } from '../__fixtures__/controls';
import { elbAttributes } from '../__fixtures__/elbAttributes';
import { ShopPage } from './pages/ShopPage';

// The tags the Shop page carried before the shared-kit restructure, with the
// default controls. A failing test means a tag moved: fix the code, never the
// fixture.
test('the Shop page keeps its tags', () => {
  expect(elbAttributes(<ShopPage controls={testControls()} />)).toEqual(
    fixture,
  );
});
