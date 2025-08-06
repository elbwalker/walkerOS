import { getProductById } from '../data/products';
import { tagger } from '../walker';

function CheckoutCart() {
  const cartItems = [
    { productId: 1, quantity: 2 },
    { productId: 9, quantity: 1 },
    { productId: 5, quantity: 1 },
  ];

  const cartItemsWithDetails = cartItems
    .map((item) => {
      const product = getProductById(item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subtotal = cartItemsWithDetails.reduce(
    (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
    0,
  );

  return (
    <div
      {...tagger().entity('cart').action('load', 'view').get()}
      className="bg-white rounded-lg shadow p-6"
    >
      <h2 className="text-xl font-semibold mb-4">Shopping Cart</h2>

      <div className="space-y-4">
        {cartItemsWithDetails.map((item) => (
          <div
            key={item.id}
            {...tagger()
              .entity('product')
              .data({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
              })
              .get()}
            className="flex justify-between items-center pb-4 border-b"
          >
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
              <p className="text-xs text-gray-500 capitalize">
                {item.category}
              </p>
            </div>
            <p className="font-semibold">
              €{(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center">
          <p className="text-lg font-semibold">Subtotal</p>
          <p className="text-lg font-semibold">€{subtotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutCart;
