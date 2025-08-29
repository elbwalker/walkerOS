import { Link } from 'react-router-dom';
import CheckoutCart from '../components/CheckoutCart';
import CheckoutAddress from '../components/CheckoutAddress';
import CheckoutSummary from '../components/CheckoutSummary';
import Hero from '../components/Hero';

function Checkout() {
  return (
    <div className="py-8">
      <Hero />

      <div className="mb-8 mt-12">
        <Link
          to="/product/1"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Shopping
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CheckoutCart />
          <CheckoutAddress />
        </div>

        <div className="lg:col-span-1">
          <CheckoutSummary />
        </div>
      </div>
    </div>
  );
}

export default Checkout;
