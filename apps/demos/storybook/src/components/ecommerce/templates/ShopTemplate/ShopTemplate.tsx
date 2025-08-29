import { useState } from 'react';
import { Header } from '../../organisms/Header';
import { ProductGrid, type Product } from '../../organisms/ProductGrid';
import { Typography } from '../../atoms/Typography';
import './ShopTemplate.css';

const sampleProducts: Product[] = [
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

export interface ShopTemplateProps {
  user?: {
    name: string;
    avatar?: string;
  };
}

export const ShopTemplate = ({ user }: ShopTemplateProps) => {
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(sampleProducts);
  const [, setSelectedProduct] = useState<Product | null>(null);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredProducts(sampleProducts);
      return;
    }

    const filtered = sampleProducts.filter(
      (product) =>
        product.title.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()),
    );
    setFilteredProducts(filtered);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    alert(
      `Selected product: ${product.title}\nPrice: ${product.price}\n\nThis would normally navigate to the product detail page.`,
    );
  };

  const handleLogin = () => {
    alert('Login functionality would be implemented here.');
  };

  const handleSignup = () => {
    alert('Signup functionality would be implemented here.');
  };

  const handleLogout = () => {
    alert('Logout functionality would be implemented here.');
  };

  return (
    <div className="storybook-shop-template">
      <Header
        title="Component Store"
        logo="https://via.placeholder.com/120x32/1ea7fd/ffffff?text=SHOP"
        user={user}
        onSearch={handleSearch}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onLogout={handleLogout}
      />

      <main className="storybook-shop-template__main">
        <div className="storybook-shop-template__hero">
          <Typography variant="h1" align="center" color="primary">
            Welcome to Component Store
          </Typography>
          <Typography variant="body1" align="center" color="secondary">
            Discover amazing products built with our atomic design system
          </Typography>
        </div>

        <ProductGrid
          title="Featured Products"
          products={filteredProducts}
          onProductClick={handleProductClick}
          columns={3}
        />

        {filteredProducts.length === 0 && (
          <div className="storybook-shop-template__no-results">
            <Typography variant="h3" align="center" color="secondary">
              No products found
            </Typography>
            <Typography variant="body1" align="center" color="secondary">
              Try searching for something else
            </Typography>
          </div>
        )}
      </main>

      <footer className="storybook-shop-template__footer">
        <Typography variant="body2" align="center" color="secondary">
          Built with Atomic Design Principles • Components powered by Storybook
        </Typography>
      </footer>
    </div>
  );
};
