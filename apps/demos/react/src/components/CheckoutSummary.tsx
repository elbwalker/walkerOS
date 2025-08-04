import { Link } from 'react-router-dom';

function CheckoutSummary() {
  const orderSummary = {
    subtotal: 27.96,
    shipping: 4.99,
    tax: 2.8,
    total: 35.75,
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

      <div className="space-y-3">
        <div className="flex justify-between">
          <p className="text-gray-600">Subtotal</p>
          <p className="font-medium">€{orderSummary.subtotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-gray-600">Shipping</p>
          <p className="font-medium">€{orderSummary.shipping.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-gray-600">Tax</p>
          <p className="font-medium">€{orderSummary.tax.toFixed(2)}</p>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between">
            <p className="text-lg font-semibold">Total</p>
            <p className="text-lg font-semibold text-blue-600">
              €{orderSummary.total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/order/123"
        className="mt-6 block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Place Order
      </Link>
    </div>
  );
}

export default CheckoutSummary;
