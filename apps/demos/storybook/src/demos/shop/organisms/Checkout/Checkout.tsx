import type { FormEvent } from 'react';
import { assign } from '@walkeros/core';
import { Button } from '../../../../shared/atoms/Button';
import { Heading } from '../../../../shared/atoms/Heading';
import { Input } from '../../../../shared/atoms/Input';
import { Select } from '../../../../shared/atoms/Select';
import { useText } from '../../../../shared/language';
import { CartLineItem } from '../../molecules/CartLineItem';
import { FormField } from '../../../../shared/molecules/FormField';
import { SummaryRow } from '../../molecules/SummaryRow';
import {
  cartItems,
  checkoutFields,
  checkoutSummary,
  type CartItem,
  type SummaryLine,
} from '../../data';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface CheckoutProps {
  items?: CartItem[];
  summary?: SummaryLine[];
  countries?: string[];
  onRemove?: (item: CartItem) => void;
  onConfirm?: () => void;
  dataElb?: DataElb;
}

interface AddressField {
  label: string;
  name: string;
  autoComplete?: string;
  wide?: boolean;
}

const addressFields: AddressField[] = [
  { label: 'First name', name: 'first-name', autoComplete: 'given-name' },
  { label: 'Last name', name: 'last-name', autoComplete: 'family-name' },
  { label: 'Company', name: 'company', wide: true },
  {
    label: 'Address',
    name: 'address',
    autoComplete: 'street-address',
    wide: true,
  },
  { label: 'Apartment, suite, etc.', name: 'apartment', wide: true },
  { label: 'City', name: 'city', autoComplete: 'address-level2' },
];

const regionFields: AddressField[] = [
  { label: 'State / Province', name: 'region', autoComplete: 'address-level1' },
  { label: 'Postal code', name: 'postal-code', autoComplete: 'postal-code' },
  { label: 'Phone', name: 'phone', autoComplete: 'tel', wide: true },
];

// The demo form sends nothing: a submit (Enter in a field) stays on the page.
const preventSubmit = (event: FormEvent<HTMLFormElement>) =>
  event.preventDefault();

const renderField = ({ label, name, autoComplete, wide }: AddressField) => (
  <FormField key={name} label={label} className={wide ? 'sm:col-span-2' : ''}>
    {(id) => <Input id={id} name={name} autoComplete={autoComplete} />}
  </FormField>
);

export const Checkout = ({
  items = cartItems,
  summary = checkoutSummary,
  countries = checkoutFields.countries,
  onRemove,
  onConfirm,
  dataElb,
}: CheckoutProps) => {
  const t = useText();
  const trackingProps = createTrackingProps(
    assign({ context: { shopping: 'checkout' } }, dataElb),
  );

  return (
    <section
      {...trackingProps}
      className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)"
    >
      <h2 className="sr-only">{t('Checkout')}</h2>
      <form
        {...createTrackingProps({
          entity: 'checkout',
          trigger: 'visible',
          action: 'view',
        })}
        onSubmit={preventSubmit}
        className="grid gap-10 lg:grid-cols-2 lg:gap-x-12"
      >
        <div>
          <Heading level={2} variant="title-item">
            {t('Contact information')}
          </Heading>
          <FormField className="mt-4" label="Email address">
            {(id) => (
              <Input
                id={id}
                type="email"
                name="email-address"
                autoComplete="email"
              />
            )}
          </FormField>
          <div className="mt-10 border-t border-border pt-10">
            <Heading level={2} variant="title-item">
              {t('Shipping information')}
            </Heading>
            <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              {addressFields.map(renderField)}
              <FormField label="Country">
                {(id) => (
                  <Select
                    id={id}
                    name="country"
                    autoComplete="country-name"
                    options={countries.map((country) => ({
                      value: country,
                      label: t(country),
                    }))}
                  />
                )}
              </FormField>
              {regionFields.map(renderField)}
            </div>
          </div>
        </div>

        <div>
          <Heading level={2} variant="title-item">
            {t('Order summary')}
          </Heading>
          <div className="mt-4 rounded-lg border border-border bg-surface">
            <h3 className="sr-only">{t('Items in your cart')}</h3>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <CartLineItem
                  key={item.name}
                  item={item}
                  onRemove={onRemove && (() => onRemove(item))}
                />
              ))}
            </ul>
            <dl className="space-y-6 border-t border-border px-4 py-6 sm:px-6">
              {summary.map((line) => (
                <SummaryRow key={line.label} entity="checkout" line={line} />
              ))}
            </dl>
            <div className="border-t border-border px-4 py-6 sm:px-6">
              <Button
                variant="primary"
                className="w-full"
                onClick={onConfirm}
                {...createTrackingProps({
                  trigger: 'click',
                  action: 'confirm',
                })}
              >
                {t('Confirm order')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
};
