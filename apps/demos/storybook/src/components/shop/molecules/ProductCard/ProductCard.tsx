import { assign } from '@walkeros/core';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Price } from '../../atoms/Price';
import { ProductImage } from '../../atoms/ProductImage';
import type { Product } from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
  dataElb?: DataElb;
}

export const ProductCard = ({
  product,
  onAddToCart,
  dataElb,
}: ProductCardProps) => {
  const { name, price, id, flag, imageAlt } = product;
  const trackingProps = createTrackingProps(
    assign(
      {
        entity: 'product',
        action: 'impression',
        // A product without a visible id element carries it on the card.
        ...(id ? { data: { id } } : {}),
      },
      dataElb,
    ),
  );

  return (
    <div
      {...trackingProps}
      className="flex flex-col rounded-lg border border-border bg-surface p-2"
    >
      <div
        {...createTrackingProps({ action: 'click' })}
        className="cursor-pointer"
      >
        <ProductImage name={name} alt={imageAlt} />
        <Heading
          level={3}
          variant="title-item"
          className="mt-4 flex flex-wrap items-center gap-2"
          {...propertyProps('product', { name })}
        >
          {name}
          {flag && (
            <Badge {...propertyProps('product', { flag: flag.value })}>
              {flag.label}
            </Badge>
          )}
        </Heading>
        <Price
          amount={price}
          variant="body-lg"
          className="mt-1 font-semibold"
          {...propertyProps('product', { price })}
        />
      </div>
      <Button
        variant="secondary"
        className="mt-4 w-full"
        onClick={onAddToCart}
        {...createTrackingProps({
          trigger: 'click',
          action: 'add',
          context: { shopping: 'cart' },
        })}
      >
        Add to cart
      </Button>
    </div>
  );
};
