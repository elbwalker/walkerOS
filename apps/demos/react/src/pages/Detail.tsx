import { Link, useParams } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import ProductList from '../components/ProductList';
import Hero from '../components/Hero';

function Detail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="py-8">
      <Hero />

      <div className="mb-8 mt-12">
        <Link
          to="/category"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Category
        </Link>
      </div>

      <ProductDetail productId={id || '1'} />

      <div className="mt-12">
        <ProductList
          currentProductId={parseInt(id || '1')}
          title="Related Products"
        />
      </div>
    </div>
  );
}

export default Detail;
