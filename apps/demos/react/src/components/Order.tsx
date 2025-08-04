import { getProductById } from '../data/products';

interface OrderProps {
  orderId: string;
}

function Order({ orderId }: OrderProps) {
  const cartItems = [
    { productId: 1, quantity: 2 },
    { productId: 9, quantity: 1 },
    { productId: 5, quantity: 1 },
  ];

  const orderItems = cartItems
    .map((item) => {
      const product = getProductById(item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);

  const orderDetails = {
    id: orderId,
    date: new Date().toLocaleDateString('en-GB'),
    total: 35.75,
    status: 'Confirmed',
    items: orderItems,
    shipping: {
      name: 'John Smith',
      address: '123 Main Street',
      city: 'Amsterdam',
      state: 'North Holland',
      zip: '1012 AB',
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-gray-600">
          Thank you for your purchase. Your order has been received.
        </p>
      </div>

      <div className="border-t border-b py-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Order Number</p>
            <p className="font-semibold">#{orderDetails.id}</p>
          </div>
          <div>
            <p className="text-gray-600">Order Date</p>
            <p className="font-semibold">{orderDetails.date}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-semibold text-green-600">
              {orderDetails.status}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total</p>
            <p className="font-semibold">€{orderDetails.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">Order Items</h3>
        <div className="space-y-3">
          {orderDetails.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium">
                €{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Shipping Address</h3>
        <div className="text-sm text-gray-600">
          <p>{orderDetails.shipping.name}</p>
          <p>{orderDetails.shipping.address}</p>
          <p>
            {orderDetails.shipping.city}, {orderDetails.shipping.state}{' '}
            {orderDetails.shipping.zip}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Order;
