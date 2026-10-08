import { useState } from 'react';
import { createDemoProduct, recommendations, type Product } from './data';

/**
 * The state behind "Add product": the recommendations plus every product
 * appended so far, as the static demo's addProduct() appends them. Used by the
 * page story and the demo site's Shop.
 */
export function useDemoProducts(): [Product[], () => void] {
  const [added, setAdded] = useState<Product[]>([]);
  const addProduct = () =>
    setAdded((previous) => [
      ...previous,
      createDemoProduct(previous.length + 1),
    ]);
  return [[...recommendations, ...added], addProduct];
}
