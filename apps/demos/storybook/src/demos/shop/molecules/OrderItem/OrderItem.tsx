import { assign } from '@walkeros/core';
import { Price } from '../../../../shared/atoms/Price';
import { ProductImage } from '../../atoms/ProductImage';
import { ProductFacts } from '../ProductFacts';
import type { CartItem } from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface OrderItemProps {
  item: CartItem;
  dataElb?: DataElb;
}

export const OrderItem = ({ item, dataElb }: OrderItemProps) => {
  const { name, color, size, price, currency, imageAlt } = item;
  const trackingProps = createTrackingProps(
    assign({ entity: 'product' }, dataElb),
  );

  return (
    <li {...trackingProps} className="flex gap-6 py-6">
      <ProductImage name={name} alt={imageAlt} className="w-24 shrink-0" />
      <ProductFacts
        name={name}
        color={color}
        size={size}
        className="flex-auto"
      />
      <Price
        amount={price}
        fractionDigits={2}
        className="flex-none font-semibold"
        {...propertyProps('product', { price, currency })}
      />
    </li>
  );
};
