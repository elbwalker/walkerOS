import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import './ProductGrid.css';

export interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: string;
}

export interface ProductGridProps {
  title?: string;
  products: Product[];
  onProductClick?: (product: Product) => void;
  columns?: 2 | 3 | 4;
}

export const ProductGrid = ({
  title,
  products,
  onProductClick,
  columns = 3,
}: ProductGridProps) => {
  return (
    <div className="storybook-product-grid">
      {title && (
        <div className="storybook-product-grid__header">
          <Typography variant="h2" align="center">
            {title}
          </Typography>
        </div>
      )}
      <div
        className={`storybook-product-grid__grid storybook-product-grid__grid--${columns}`}
      >
        {products.map((product) => (
          <Card
            key={product.id}
            title={product.title}
            description={product.description}
            imageUrl={product.imageUrl}
            actionLabel={
              product.price ? `Buy - ${product.price}` : 'View Details'
            }
            onAction={() => onProductClick?.(product)}
            variant="elevated"
          />
        ))}
      </div>
    </div>
  );
};
