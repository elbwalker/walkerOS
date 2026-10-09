import { Fragment, type ReactElement, type ReactNode } from 'react';
import type { ImageProps } from '../../../../shared/atoms/Image';
import { Heading } from '../../../../shared/atoms/Heading';
import { useText } from '../../../../shared/language';
import { CarouselItem } from '../../molecules/CarouselItem';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';
import { assign } from '@walkeros/core';

export interface CarouselSectionProps {
  title: string;
  items: Array<{
    title: string;
    alt?: string;
  }>;
  onItemClick?: (id: unknown) => void;
  type?: ImageProps['type'];
  dataElb?: DataElb;
  /** Wraps each item card, the entity box (for a source view). */
  wrapItem?: (card: ReactElement) => ReactNode;
}

export const CarouselSection = ({
  title,
  items,
  onItemClick,
  type = 'thumbnail',
  dataElb,
  wrapItem,
}: CarouselSectionProps) => {
  // The list context keeps the English title; only the heading translates.
  const t = useText();
  const trackingProps = createTrackingProps(
    assign(
      {
        context: { list: title },
      },
      dataElb,
    ),
    'CarouselSection',
  );

  return (
    <section {...trackingProps} className="py-6 overflow-visible">
      <div className="max-w-7xl mx-auto px-6 overflow-visible">
        <Heading level={3} variant="title-plan" className="mb-8">
          {t(title)}
        </Heading>

        <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-4 -mx-2 -my-2">
          {items.map((item, index) => {
            const position = index + 1;
            const card = (
              <CarouselItem
                title={item.title}
                position={position}
                style={position}
                type={type}
                alt={item.alt}
                onClick={() => onItemClick?.(position)}
              />
            );
            return (
              <Fragment key={index}>
                {wrapItem ? wrapItem(card) : card}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};
