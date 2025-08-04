import { getProductById } from '../data/products';

interface ProductDetailProps {
  productId: string;
}

function ProductDetail({ productId }: ProductDetailProps) {
  const product = getProductById(parseInt(productId));

  if (!product) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">
          Product not found. Please check the product ID and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Product Image</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-yellow-500">
              {'★'.repeat(Math.floor(product.rating))}
            </span>
            <span className="text-sm text-gray-500">
              ({product.rating} stars)
            </span>
            <span className="text-sm text-gray-400">| {product.category}</span>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <p className="text-3xl font-bold text-blue-600">€{product.price}</p>
            {product.priceOld && (
              <p className="text-xl text-gray-400 line-through">
                €{product.priceOld}
              </p>
            )}
          </div>

          <p className="text-gray-600 mb-6">{product.description}</p>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Product Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Premium quality ingredients</li>
              <li>Freshly made daily</li>
              <li>Allergen information available</li>
              <li>Satisfaction guaranteed</li>
              <li>Fast shipping available</li>
            </ul>
          </div>

          <div className="space-y-4">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
              Add to Cart
            </button>
            <button className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors">
              Add to Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
