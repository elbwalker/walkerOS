import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import ProductList from '../components/ProductList';

function Category() {
  return (
    <div className="py-8">
      <Hero />

      <div className="mb-8 mt-12">
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
        <p className="text-gray-600">
          Browse our selection of premium food products
        </p>
      </div>

      <ProductList showAllProducts={true} title="All Products" />
    </div>
  );
}

export default Category;
