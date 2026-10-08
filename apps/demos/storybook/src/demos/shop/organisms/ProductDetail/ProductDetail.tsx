import { useId } from 'react';
import { assign } from '@walkeros/core';
import { Heading } from '../../../../shared/atoms/Heading';
import { Icon } from '../../../../shared/atoms/Icon';
import { Price } from '../../../../shared/atoms/Price';
import { ProductImage } from '../../atoms/ProductImage';
import { StarRating } from '../../../../shared/atoms/StarRating';
import { Text } from '../../../../shared/atoms/Text';
import { useText } from '../../../../shared/language';
import { Breadcrumb } from '../../molecules/Breadcrumb';
import { StatusMessage } from '../../../../shared/molecules/StatusMessage';
import { productDetail, type ProductDetailContent } from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface ProductDetailProps {
  product?: ProductDetailContent;
  dataElb?: DataElb;
}

export const ProductDetail = ({
  product = productDetail,
  dataElb,
}: ProductDetailProps) => {
  const informationId = useId();
  const t = useText();
  const {
    id,
    name,
    category,
    price,
    currency,
    rating,
    reviews,
    availability,
    description,
    guarantee,
    imageAlt,
  } = product;
  const trackingProps = createTrackingProps(
    assign({ context: { shopping: 'detail' } }, dataElb),
  );

  return (
    <section
      {...trackingProps}
      className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)"
    >
      <div
        {...createTrackingProps({
          entity: 'product',
          trigger: 'visible',
          action: 'view',
          data: { id },
        })}
        className="grid gap-x-8 gap-y-10 lg:grid-cols-2"
      >
        <div className="lg:max-w-lg lg:self-end">
          <Breadcrumb
            items={category}
            {...propertyProps('product', { category: category.join('/') })}
          />
          <Heading
            level={1}
            variant="heading-md"
            className="mt-4"
            {...propertyProps('product', { name })}
          >
            {t(name)}
          </Heading>
          <section aria-labelledby={informationId} className="mt-4">
            <h2 id={informationId} className="sr-only">
              {t('Product information')}
            </h2>
            <div className="flex items-center">
              <Price
                amount={price}
                variant="body-lg"
                {...propertyProps('product', { price, currency })}
              />
              <div className="ml-4 flex items-center border-l border-border pl-4">
                <StarRating
                  rating={rating}
                  {...propertyProps('product', { rating })}
                />
                <Text
                  variant="small"
                  className="ml-2 font-normal"
                  {...propertyProps('product', { reviews })}
                >
                  {t(`${reviews} reviews`)}
                </Text>
              </div>
            </div>
            <Text className="mt-4">{t(description)}</Text>
            <StatusMessage
              tone="success"
              variant="small"
              textTone="fg-2"
              className="mt-6"
              {...propertyProps('product', {
                availability: availability.value,
              })}
            >
              {t(availability.label)}
            </StatusMessage>
          </section>
        </div>
        <ProductImage
          name={name}
          alt={imageAlt}
          aspect="wide"
          className="lg:col-start-2 lg:row-span-2 lg:self-center"
        />
        <div className="flex items-center justify-center gap-2 text-fg-2 lg:col-start-1 lg:row-start-2 lg:max-w-lg lg:self-start">
          <Icon name="shield-check" className="size-6" />
          <Text as="span" variant="ui">
            {t(guarantee)}
          </Text>
        </div>
      </div>
    </section>
  );
};
