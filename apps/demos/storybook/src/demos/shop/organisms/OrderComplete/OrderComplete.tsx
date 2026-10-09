import { assign } from '@walkeros/core';
import { Badge } from '../../../../shared/atoms/Badge';
import { Heading } from '../../../../shared/atoms/Heading';
import { Link } from '../../../../shared/atoms/Link';
import { Text } from '../../../../shared/atoms/Text';
import { useText } from '../../../../shared/language';
import { OrderItem } from '../../molecules/OrderItem';
import { StatusMessage } from '../../../../shared/molecules/StatusMessage';
import { SummaryRow } from '../../molecules/SummaryRow';
import {
  order as defaultOrder,
  orderItems,
  type CartItem,
  type OrderContent,
} from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface OrderCompleteProps {
  order?: OrderContent;
  items?: CartItem[];
  dataElb?: DataElb;
}

export const OrderComplete = ({
  order = defaultOrder,
  items = orderItems,
  dataElb,
}: OrderCompleteProps) => {
  const { id, status, title, text, trackingNumber, summary, address, payment } =
    order;
  const t = useText();
  const trackingProps = createTrackingProps(
    assign({ context: { shopping: 'complete' } }, dataElb),
  );

  return (
    <section
      {...trackingProps}
      className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)"
    >
      <div
        {...createTrackingProps({
          entity: 'order',
          trigger: 'visible',
          action: 'complete',
          data: { id },
        })}
        className="mx-auto max-w-2xl"
      >
        <StatusMessage tone="success" variant="small" textTone="fg-2">
          {t(status)}
        </StatusMessage>
        <Heading level={2} variant="heading-lg" className="mt-2">
          {t(title)}
        </Heading>
        <Text className="mt-2">{t(text)}</Text>

        <dl className="mt-16">
          <Text as="dt" variant="ui" tone="fg">
            {t('Tracking number')}
          </Text>
          <Text as="dd" variant="ui" tone="fg" className="mt-2 font-semibold">
            {trackingNumber}
          </Text>
        </dl>

        <ul className="mt-6 divide-y divide-border border-t border-border">
          {items.map((item) => (
            <OrderItem key={item.name} item={item} />
          ))}
        </ul>

        <dl className="space-y-6 border-t border-border pt-6">
          {summary.map((line) => (
            <SummaryRow key={line.label} entity="order" line={line} />
          ))}
        </dl>

        <dl className="mt-16 grid grid-cols-2 gap-x-4">
          <div>
            <Text as="dt" variant="ui" tone="fg">
              {t('Shipping Address')}
            </Text>
            <dd className="mt-2">
              <address className="not-italic">
                {address.lines.map((line) => (
                  <Text
                    key={line}
                    as="span"
                    variant="ui"
                    className="block font-normal"
                  >
                    {t(line)}
                  </Text>
                ))}
                <Text
                  as="span"
                  variant="ui"
                  className="block font-normal"
                  {...propertyProps('order', { 'shipping-city': address.city })}
                >
                  {t(address.city)}
                </Text>
                <Text
                  as="span"
                  variant="ui"
                  className="block font-normal"
                  {...propertyProps('order', {
                    'shipping-country': address.country,
                  })}
                >
                  {t(address.country)}
                </Text>
              </address>
            </dd>
          </div>
          <div>
            <Text as="dt" variant="ui" tone="fg">
              {t('Payment Information')}
            </Text>
            <dd className="mt-2 flex items-start gap-4">
              <Badge>{t(payment.brand)}</Badge>
              <div>
                <Text variant="ui" tone="fg" className="font-normal">
                  {t(`Ending with ${payment.ending}`)}
                </Text>
                <Text variant="ui" className="font-normal">
                  {t(`Expires ${payment.expires}`)}
                </Text>
              </div>
            </dd>
          </div>
        </dl>

        <div className="mt-16 border-t border-border py-6 text-right">
          <Link variant="link">
            {t('Continue Shopping')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
