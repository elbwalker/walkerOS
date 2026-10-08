import { useState } from 'react';
import { createDemoProduct, recommendations, type Product } from './data';

/**
 * Story state behind "Add product": the recommendations plus every product
 * appended so far, as the static demo's addProduct() appends them. For the
 * stories only; the shop index does not export it.
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
