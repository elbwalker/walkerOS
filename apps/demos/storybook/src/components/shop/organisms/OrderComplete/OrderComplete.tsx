import { assign } from '@walkeros/core';
import { Badge } from '../../atoms/Badge';
import { Heading } from '../../atoms/Heading';
import { Link } from '../../atoms/Link';
import { Text } from '../../atoms/Text';
import { OrderItem } from '../../molecules/OrderItem';
import { StatusMessage } from '../../molecules/StatusMessage';
import { SummaryRow } from '../../molecules/SummaryRow';
import {
  order as defaultOrder,
  orderItems,
  type CartItem,
  type OrderContent,
} from '../../data';
import { propertyProps } from '../../tagging';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

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
          {status}
        </StatusMessage>
        <Heading level={2} variant="heading-lg" className="mt-2">
          {title}
        </Heading>
        <Text className="mt-2">{text}</Text>

        <dl className="mt-16">
          <Text as="dt" variant="ui" tone="fg">
            Tracking number
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
              Shipping Address
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
                    {line}
                  </Text>
                ))}
                <Text
                  as="span"
                  variant="ui"
                  className="block font-normal"
                  {...propertyProps('order', { 'shipping-city': address.city })}
                >
                  {address.city}
                </Text>
                <Text
                  as="span"
                  variant="ui"
                  className="block font-normal"
                  {...propertyProps('order', {
                    'shipping-country': address.country,
                  })}
                >
                  {address.country}
                </Text>
              </address>
            </dd>
          </div>
          <div>
            <Text as="dt" variant="ui" tone="fg">
              Payment Information
            </Text>
            <dd className="mt-2 flex items-start gap-4">
              <Badge>{payment.brand}</Badge>
              <div>
                <Text variant="ui" tone="fg" className="font-normal">
                  Ending with {payment.ending}
                </Text>
                <Text variant="ui" className="font-normal">
                  Expires {payment.expires}
                </Text>
              </div>
            </dd>
          </div>
        </dl>

        <div className="mt-16 border-t border-border py-6 text-right">
          <Link variant="link">
            Continue Shopping <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
