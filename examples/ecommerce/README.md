# Ecommerce examples

This examples show some common ecommerce implementations. Search for the elb-tags like `elb`, `elbaction`, `elbglobals`, `elb-product`, `elb-cart`

# pages

- [Product_Overview](./ecommerce/product-overview.html)
  Events: product view, product add

  Tracked data:
  sku (needs to be added to the template)
  name
  category
  price
  size
  availabilty
  rating

- [Product_List](./ecommerce/product-list.html)
  Events: product impression, product click

  Tracked data:
  name
  pagetype
  nested:
  product name
  product price
  product color

- [Checkout_Form](./ecommerce/checkout-form.html)
  Events: checkout start, checkout confirm

  Tracked data:
  deliverymethod
  paymentoption
  nested:
  product name
  product price
  product color
  product size
  product quantity
  subtotal
  shipping
  taxes
  total

- [Order_Summary](./ecommerce/order-summary.html)
  Events: order complete
  Tracked data:
  id (needs to added to the template)
  nested:
  product name
  product price
  product color
  product size
  product quantity
  shipping-city
  shipping-country
  subtotal
  shipping
  taxes
  total
