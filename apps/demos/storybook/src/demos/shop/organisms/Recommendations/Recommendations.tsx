import { Fragment, type ReactElement, type ReactNode } from 'react';
import { assign } from '@walkeros/core';
import { Button } from '../../../../shared/atoms/Button';
import { Heading } from '../../../../shared/atoms/Heading';
import { useText } from '../../../../shared/language';
import { ProductCard } from '../../molecules/ProductCard';
import { recommendations, type Product } from '../../data';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface RecommendationsProps {
  title?: string;
  products?: Product[];
  /** Shows the "Add product" button, which appends a product to the grid. */
  onAddProduct?: () => void;
  onAddToCart?: (product: Product) => void;
  dataElb?: DataElb;
  /** Wraps each product card, the entity box (for a source view). */
  wrapProduct?: (card: ReactElement) => ReactNode;
}

export const Recommendations = ({
  title = 'Recommendations',
  products = recommendations,
  onAddProduct,
  onAddToCart,
  dataElb,
  wrapProduct,
}: RecommendationsProps) => {
  const t = useText();
  const trackingProps = createTrackingProps(
    assign({ context: { module: 'recommendations' } }, dataElb),
  );

  return (
    <section
      {...trackingProps}
      className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)"
    >
      <Heading level={2} variant="title-plan">
        {t(title)}
      </Heading>
      {/* data-elbobserve has no tagger method: it makes the walker register cards appended later. */}
      <div
        data-elbobserve=""
        {...createTrackingProps({ context: { shopping: 'inspo' } })}
        className="mt-8 grid grid-cols-1 gap-x-(--space-5) gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {products.map((product) => {
          const card = (
            <ProductCard
              product={product}
              onAddToCart={onAddToCart && (() => onAddToCart(product))}
            />
          );
          return (
            <Fragment key={product.id ?? product.name}>
              {wrapProduct ? wrapProduct(card) : card}
            </Fragment>
          );
        })}
      </div>
      {onAddProduct && (
        <div className="mt-8">
          <Button variant="secondary" onClick={onAddProduct}>
            {t('Add product')}
          </Button>
        </div>
      )}
    </section>
  );
};
