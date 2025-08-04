import Hero from '../components/Hero';
import Product from '../components/Product';

function PageB() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Page B - Demo Content
      </h1>

      <div className="space-y-12">
        <Hero />
        <Product />
      </div>
    </div>
  );
}

export default PageB;
