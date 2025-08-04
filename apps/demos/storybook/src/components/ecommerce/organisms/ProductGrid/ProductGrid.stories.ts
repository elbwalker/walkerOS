import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductGrid } from './ProductGrid';

const meta: Meta<typeof ProductGrid> = {
  title: 'Ecommerce/Organisms/ProductGrid',
  component: ProductGrid,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { height: '600px' },
    },
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleProducts = [
  {
    id: '1',
    title: 'Wireless Headphones',
    description:
      'Premium quality wireless headphones with noise cancellation and 30-hour battery life.',
    imageUrl: 'https://picsum.photos/300/200?random=10',
    price: '$299',
  },
  {
    id: '2',
    title: 'Smart Watch',
    description:
      'Advanced fitness tracking with heart rate monitoring and GPS functionality.',
    imageUrl: 'https://picsum.photos/300/200?random=11',
    price: '$399',
  },
  {
    id: '3',
    title: 'Laptop Stand',
    description:
      'Ergonomic aluminum laptop stand with adjustable height and angle.',
    imageUrl: 'https://picsum.photos/300/200?random=12',
    price: '$79',
  },
  {
    id: '4',
    title: 'Mechanical Keyboard',
    description:
      'RGB backlit mechanical keyboard with custom switches and programmable keys.',
    imageUrl: 'https://picsum.photos/300/200?random=13',
    price: '$159',
  },
  {
    id: '5',
    title: 'Wireless Mouse',
    description:
      'Precision wireless mouse with customizable DPI and ergonomic design.',
    imageUrl: 'https://picsum.photos/300/200?random=14',
    price: '$89',
  },
  {
    id: '6',
    title: 'USB-C Hub',
    description:
      'Multi-port USB-C hub with HDMI, USB 3.0, and fast charging support.',
    imageUrl: 'https://picsum.photos/300/200?random=15',
    price: '$49',
  },
];

export const Default: Story = {
  args: {
    title: 'Featured Products',
    products: sampleProducts,
    onProductClick: (product) => alert(`Selected: ${product.title}`),
  },
};

export const TwoColumns: Story = {
  args: {
    title: 'Best Sellers',
    products: sampleProducts.slice(0, 4),
    columns: 2,
    onProductClick: (product) => console.log('Product clicked:', product),
  },
};

export const FourColumns: Story = {
  args: {
    title: 'All Products',
    products: sampleProducts,
    columns: 4,
    onProductClick: (product) => console.log('Product clicked:', product),
  },
};

export const NoTitle: Story = {
  args: {
    products: sampleProducts.slice(0, 3),
    onProductClick: (product) => console.log('Product clicked:', product),
  },
};
