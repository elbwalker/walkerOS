import type { DemoPageProps } from '../shared/controls';
import { ShopPage, useDemoProducts } from '../demos/shop';

/**
 * The Shop with "Add product", as on the static demo: appended cards show
 * what the grid's data-elbobserve does.
 */
export const ShopSitePage = ({ controls }: DemoPageProps) => {
  const [products, addProduct] = useDemoProducts();
  return (
    <ShopPage
      controls={controls}
      products={products}
      onAddProduct={addProduct}
    />
  );
};
