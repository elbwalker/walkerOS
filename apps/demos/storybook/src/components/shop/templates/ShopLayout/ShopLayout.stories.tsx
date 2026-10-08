import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ShopLayout } from './ShopLayout';
import { ConsentBar } from '../../organisms/ConsentBar';
import { Footer } from '../../organisms/Footer';
import { Header } from '../../organisms/Header';
import { PromotionHero } from '../../organisms/PromotionHero';

// No autodocs: the pinned consent bar would stack on a docs page.
const meta: Meta<typeof ShopLayout> = {
  title: 'Shop/Templates/ShopLayout',
  component: ShopLayout,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    header: <Header />,
    footer: <Footer />,
    consent: (
      <ConsentBar
        state="unknown"
        onAccept={fn()}
        onDeny={fn()}
        onReset={fn()}
      />
    ),
    children: <PromotionHero />,
  },
};
