import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShopPage } from './ShopPage';
import { useStoryControls } from '../../../../shared/stories/useStoryControls';
import { useDemoProducts } from '../../useDemoProducts';

// The page with the static demo's behaviour: language, demo user and consent
// in story state, consent sent to the addon's collector, "Add product"
// appending from the demo catalog.
const ConnectedShopPage = () => {
  const controls = useStoryControls();
  const [products, addProduct] = useDemoProducts();
  return (
    <ShopPage
      controls={controls}
      products={products}
      onAddProduct={addProduct}
    />
  );
};

// No autodocs: the page is one long story with a pinned consent bar.
const meta: Meta = {
  title: 'Shop/Pages/Shop',
  tags: ['shop'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: 'Shop',
  render: () => <ConnectedShopPage />,
};
