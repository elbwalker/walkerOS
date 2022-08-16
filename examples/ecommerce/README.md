# Ecommerce examples

This examples show some common ecommerce implementations. Search for the elb-tags like `data-elb`, `data-elbaction`, `data-elbglobals`, `data-elb-product`, `data-elb-cart`

# pages

- [Product Overview](./ecommerce/product-overview.html)\
  **Events:** product view, product add

  **Tracked data:**
  sku (needs to be added to the template),
  name,
  category,
  price,
  size,
  availabilty,
  rating

- [Product List](./ecommerce/product-list.html)\
  **Events:** product impression, product click

  **Tracked data:**
  name,
  pagetype,
  nested:
  [product name,
  product price,
  product color]

- [Checkout](./ecommerce/checkout.html)\
  **Events:** checkout start, checkout confirm

  **Tracked data:**
  nested:
  [product name,
  product price,
  product color,
  product size,
  product quantity],
  subtotal,
  shipping,
  taxes,
  total

- [Order Summary](./ecommerce/order-summary.html)\
  **Events:** order complete

  **Tracked data:**
  id (needs to added to the template),
  nested:
  [product name,
  product price,
  product color,
  product size,
  product quantity],
  shipping-city,
  shipping-country,
  subtotal,
  shipping,
  taxes,
  total
