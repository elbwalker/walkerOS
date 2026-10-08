import { assign } from '@walkeros/core';
import { Heading } from '../../atoms/Heading';
import { Link } from '../../atoms/Link';
import { Text } from '../../atoms/Text';
import type { PromotionContent } from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface PromotionCardProps extends PromotionContent {
  dataElb?: DataElb;
}

export const PromotionCard = ({
  name,
  text,
  category,
  primaryCta,
  secondaryCta,
  dataElb,
}: PromotionCardProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        entity: 'promotion',
        trigger: 'visible',
        action: 'view',
        data: { category },
      },
      dataElb,
    ),
  );

  return (
    <div
      {...trackingProps}
      className="relative isolate overflow-hidden rounded-xl border border-border bg-surface px-6 py-24 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[64rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,var(--glow),transparent)]"
      />
      <Heading
        level={2}
        variant="heading-lg"
        className="relative mx-auto max-w-2xl"
        {...propertyProps('promotion', { name: '#innerText' })}
      >
        {name}
      </Heading>
      <Text variant="lead" className="relative mx-auto mt-6 max-w-xl">
        {text}
      </Text>
      <div className="relative mt-10 flex items-center justify-center gap-6">
        <Link
          variant="primary"
          {...createTrackingProps({
            trigger: 'click',
            action: primaryCta.action,
          })}
        >
          {primaryCta.label}
        </Link>
        <Link
          variant="link"
          {...createTrackingProps({
            trigger: 'click',
            action: secondaryCta.action,
          })}
        >
          {secondaryCta.label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
};
