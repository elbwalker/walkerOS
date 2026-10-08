import type { Meta, StoryObj } from '@storybook/react-vite';
import { Recommendations } from './Recommendations';
import { useDemoProducts } from '../../useDemoProducts';

const meta: Meta<typeof Recommendations> = {
  title: 'Shop/Organisms/Recommendations',
  component: Recommendations,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// The grid's data-elbobserve makes the walker register each appended card.
const WithAddProduct = () => {
  const [products, addProduct] = useDemoProducts();
  return <Recommendations products={products} onAddProduct={addProduct} />;
};

export const AddProduct: Story = {
  render: () => <WithAddProduct />,
};
