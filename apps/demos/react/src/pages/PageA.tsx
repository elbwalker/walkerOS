import Hero from '../components/Hero';
import ProductList from '../components/ProductList';

function PageA() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Page A - Demo Content
      </h1>

      <div className="space-y-12">
        <Hero />
        <ProductList />
      </div>
    </div>
  );
}

export default PageA;
