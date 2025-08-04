import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getRelatedProducts,
  products as allProducts,
  type Product,
} from '../data/products';
import { tagger } from '../walker';

interface ProductListProps {
  currentProductId?: number;
  title?: string;
  showAllProducts?: boolean;
}

// Simulate async loading with delay
const loadMoreProducts = async (
  currentProductId: number,
  offset: number,
  limit: number = 4,
  showAllProducts: boolean = false,
): Promise<Product[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (showAllProducts) {
    // Get all products and slice based on offset
    return allProducts.slice(offset, offset + limit);
  } else {
    // Get all related products and slice based on offset
    const allRelated = getRelatedProducts(currentProductId, 20); // Get more than needed
    return allRelated.slice(offset, offset + limit);
  }
};

function ProductList({
  currentProductId = 1,
  title = 'You Might Also Like',
  showAllProducts = false,
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load initial products
  useEffect(() => {
    if (showAllProducts) {
      const initialProducts = allProducts.slice(0, 4);
      setProducts(initialProducts);
      setOffset(4);
      setHasMore(allProducts.length > 4);
    } else {
      const initialProducts = getRelatedProducts(currentProductId, 4);
      setProducts(initialProducts);
      setOffset(4);
      setHasMore(initialProducts.length === 4);
    }
  }, [currentProductId, showAllProducts]);

  const handleLoadMore = async () => {
    if (loading) return;

    // Track load more click
    if (window.elb) {
      window.elb('load more click', {
        list_name: title,
        current_product_count: products.length,
        current_product_id: currentProductId,
        offset: offset,
      });
    }

    setLoading(true);
    setError(null);

    try {
      const newProducts = await loadMoreProducts(
        currentProductId,
        offset,
        4,
        showAllProducts,
      );

      if (newProducts.length === 0) {
        setHasMore(false);
        // Track no more products event
        if (window.elb) {
          window.elb('products list exhausted', {
            list_name: title,
            total_products_shown: products.length,
          });
        }
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
        setOffset((prev) => prev + newProducts.length);
        setHasMore(newProducts.length === 4);

        // Track successful load more
        if (window.elb) {
          window.elb('products loaded', {
            list_name: title,
            products_loaded: newProducts.length,
            total_products: products.length + newProducts.length,
            new_products: newProducts.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              price: p.price,
            })),
          });
        }
      }
    } catch (err) {
      setError('Failed to load more products. Please try again.');
      console.error('Error loading products:', err);

      // Track error event
      if (window.elb) {
        window.elb('load more error', {
          list_name: title,
          error_message: 'Failed to load more products',
          current_product_count: products.length,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    // Track product click event
    if (window.elb) {
      window.elb('product click', {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        rating: product.rating,
        position: products.findIndex((p) => p.id === product.id) + 1,
        list_name: title,
      });
    }
  };

  return (
    <section
      className="bg-white rounded-lg shadow p-8"
      {...tagger('product_list')}
      data-elb-product-list-name={title}
      data-elb-current-product-id={currentProductId}
    >
      <h2 className="text-2xl font-semibold mb-6">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {products.map((product, index) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="block border rounded-lg p-4 hover:shadow-md transition-shadow"
            onClick={() => handleProductClick(product)}
            {...tagger('product')}
            data-elb-product-id={product.id}
            data-elb-product-name={product.name}
            data-elb-product-price={product.price}
            data-elb-product-category={product.category}
            data-elb-product-position={index + 1}
          >
            <div className="bg-gray-100 h-32 rounded mb-3 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Product Image</span>
            </div>
            <h3 className="font-medium text-sm mb-2 line-clamp-2">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-500 text-xs">
                {'★'.repeat(Math.floor(product.rating))}
              </span>
              <span className="text-xs text-gray-500">({product.rating})</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-blue-600">€{product.price}</p>
              {product.priceOld && (
                <p className="text-xs text-gray-400 line-through">
                  €{product.priceOld}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Load More Section */}
      {(hasMore || loading || error) && (
        <div className="text-center">
          {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              {...tagger('load_more_button')}
              data-elb-products-loaded={products.length}
              data-elb-list-name={title}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : (
                'Load More Products'
              )}
            </button>
          )}

          {!hasMore && products.length > 4 && (
            <p className="text-gray-500 text-sm mt-4">
              You've seen all related products ({products.length} total)
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default ProductList;
