import { Link, useParams } from 'react-router-dom';
import Order from '../components/Order';
import Hero from '../components/Hero';

function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="py-8">
      <div className="mt-12">
        <Order orderId={id || '123'} />
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default OrderConfirmation;
