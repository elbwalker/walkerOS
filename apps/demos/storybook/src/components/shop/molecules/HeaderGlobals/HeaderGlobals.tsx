import { Icon } from '../../atoms/Icon';
import { Link } from '../../atoms/Link';
import { formatPrice } from '../../atoms/Price';
import { createTrackingProps } from '../../../../utils/tagger';

export interface HeaderGlobalsProps {
  /** The page language, sent as the `language` global. */
  language: string;
  languageLabel: string;
  /** The cart's value, sent as the `cart_value` global. */
  cartValue: number;
}

// Each link holds the value of the global it carries.
export const HeaderGlobals = ({
  language,
  languageLabel,
  cartValue,
}: HeaderGlobalsProps) => (
  <div className="flex items-center gap-4">
    <Link
      {...createTrackingProps({ globals: { language } })}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-ui"
    >
      <Icon name="globe" />
      <span className="sr-only">Language:</span>
      {languageLabel}
    </Link>
    <Link
      {...createTrackingProps({ globals: { cart_value: cartValue } })}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-ui"
    >
      <Icon name="cart" />
      <span className="sr-only">Cart:</span>
      {formatPrice(cartValue)}
    </Link>
  </div>
);
