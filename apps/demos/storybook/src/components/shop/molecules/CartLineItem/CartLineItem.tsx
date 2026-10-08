import { useId } from 'react';
import { assign } from '@walkeros/core';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Price } from '../../atoms/Price';
import { ProductImage } from '../../atoms/ProductImage';
import { Select } from '../../atoms/Select';
import { ProductFacts } from '../ProductFacts';
import type { CartItem } from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface CartLineItemProps {
  item: CartItem;
  onRemove?: () => void;
  dataElb?: DataElb;
}

const quantities = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const CartLineItem = ({
  item,
  onRemove,
  dataElb,
}: CartLineItemProps) => {
  const quantityId = useId();
  const { name, color, size, price, currency, imageAlt } = item;
  const trackingProps = createTrackingProps(
    assign({ entity: 'product' }, dataElb),
  );

  return (
    <li {...trackingProps} className="flex gap-6 px-4 py-6 sm:px-6">
      <ProductImage
        name={name}
        alt={imageAlt}
        className="w-20 shrink-0 self-start"
      />
      <div className="flex flex-1 flex-col">
        <div className="flex">
          <ProductFacts
            name={name}
            color={color}
            size={size}
            level={4}
            className="min-w-0 flex-1"
          />
          <div className="ml-4 shrink-0">
            <Button
              variant="icon"
              onClick={onRemove}
              {...createTrackingProps({ trigger: 'click', action: 'remove' })}
            >
              <span className="sr-only">Remove {name}</span>
              <Icon name="trash" />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-end justify-between pt-2">
          <Price
            amount={price}
            fractionDigits={2}
            className="mt-1 font-semibold"
            {...propertyProps('product', { price, currency })}
          />
          <div className="ml-4">
            <label htmlFor={quantityId} className="sr-only">
              Quantity
            </label>
            <Select
              id={quantityId}
              name="quantity"
              options={quantities}
              className="w-auto"
              {...propertyProps('product', { quantity: '#value' })}
            />
          </div>
        </div>
      </div>
    </li>
  );
};
