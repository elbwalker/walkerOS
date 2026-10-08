import type { ReactElement, ReactNode } from 'react';
import { assign } from '@walkeros/core';
import { PromotionCard } from '../../molecules/PromotionCard';
import { promotion, type PromotionContent } from '../../data';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface PromotionHeroProps {
  content?: PromotionContent;
  dataElb?: DataElb;
  /** Wraps the card, the promotion entity box (for a source view). */
  wrapCard?: (card: ReactElement) => ReactNode;
}

export const PromotionHero = ({
  content = promotion,
  dataElb,
  wrapCard,
}: PromotionHeroProps) => {
  const trackingProps = createTrackingProps(
    assign({ context: { test: 'engagement', category: 'analytics' } }, dataElb),
  );

  const card = <PromotionCard {...content} />;

  return (
    <section
      {...trackingProps}
      className="mx-auto max-w-(--container) px-(--gutter) py-8"
    >
      {wrapCard ? wrapCard(card) : card}
    </section>
  );
};
