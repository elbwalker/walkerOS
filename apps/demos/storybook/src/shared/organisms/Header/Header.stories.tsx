import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Header } from './Header';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Link } from '../../atoms/Link';
import { LanguageToggle } from '../../molecules/LanguageToggle';
import { UserSwitch } from '../../molecules/UserSwitch';

const controls = (
  <>
    <LanguageToggle language="en" onToggle={fn()} />
    <UserSwitch persona="anonymous" onSwitch={fn()} />
  </>
);

const meta: Meta<typeof Header> = {
  title: 'Shared/Organisms/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// A shop: anchors and a cart.
export const ShopLike: Story = {
  name: 'Shop-like',
  args: {
    links: [
      { label: 'Promotion', href: '#promotion' },
      { label: 'Recommendations', href: '#recommendations' },
      { label: 'Checkout', href: '#checkout' },
    ],
    controls,
    extras: (
      <Link className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-ui">
        <Icon name="cart" />
        €249
      </Link>
    ),
  },
};

// A media site: a brand, anchors and a search.
export const MediaLike: Story = {
  name: 'Media-like',
  args: {
    brand: (
      <Link href="#hero" className="text-title-item text-fg">
        Media Platform
      </Link>
    ),
    links: [
      { label: 'Series', href: '#series' },
      { label: 'Movies', href: '#films' },
      { label: 'Kids', href: '#promotion' },
    ],
    controls,
    extras: (
      <Button variant="icon" aria-label="Search">
        <Icon name="search" className="size-6" />
      </Button>
    ),
  },
};
