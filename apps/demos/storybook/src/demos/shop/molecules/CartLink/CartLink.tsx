import { Icon } from '../../../../shared/atoms/Icon';
import { Link } from '../../../../shared/atoms/Link';
import { formatPrice } from '../../../../shared/atoms/Price';
import { useText } from '../../../../shared/language';
import { createTrackingProps } from '../../../../shared/tagger';

export interface CartLinkProps {
  /** The cart's value, sent as the `cart_value` global. */
  cartValue: number;
}

// The link holds the value of the global it carries.
export const CartLink = ({ cartValue }: CartLinkProps) => {
  const t = useText();
  return (
    <Link
      {...createTrackingProps({ globals: { cart_value: cartValue } })}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-ui"
    >
      <Icon name="cart" />
      <span className="sr-only">{t('Cart:')}</span>
      {formatPrice(cartValue)}
    </Link>
  );
};
