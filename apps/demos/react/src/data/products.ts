export interface Product {
  id: number;
  name: string;
  price: number;
  priceOld?: number;
  category: 'sweet' | 'spicy' | 'ice-cream';
  description: string;
  rating: number;
}

export const products: Product[] = [
  // Sweet Category
  {
    id: 1,
    name: 'Rainbow Velvet Cupcakes',
    price: 4.99,
    priceOld: 6.99,
    category: 'sweet',
    description:
      'Colorful layered cupcakes with cream cheese frosting and a hint of vanilla. Made with premium ingredients for that special celebration.',
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Artisan Chocolate Chip Cookies',
    price: 3.49,
    category: 'sweet',
    description:
      'Classic comfort cookies baked fresh daily with Belgian chocolate chips. Perfect for your afternoon coffee break.',
    rating: 4.9,
  },
  {
    id: 3,
    name: 'Glazed Ring Donuts',
    price: 5.99,
    priceOld: 7.49,
    category: 'sweet',
    description:
      'Traditional yeast donuts with our signature glaze. Light, fluffy, and irresistibly sweet. Pack of 6.',
    rating: 4.6,
  },
  {
    id: 4,
    name: 'French Macarons Assortment',
    price: 12.99,
    category: 'sweet',
    description:
      'Delicate almond flour cookies with creamy ganache filling. Featuring classic flavors: vanilla, chocolate, and raspberry. Box of 12.',
    rating: 4.7,
  },

  // Spicy Category
  {
    id: 5,
    name: 'Ghost Pepper Hot Sauce',
    price: 8.99,
    priceOld: 10.99,
    category: 'spicy',
    description:
      'Intense heat sauce made with authentic ghost peppers. For serious spice enthusiasts only. Small batch artisanal production.',
    rating: 4.9,
  },
  {
    id: 6,
    name: 'Spicy Sriracha Chips',
    price: 4.49,
    category: 'spicy',
    description:
      'Crunchy potato chips with bold sriracha seasoning. The perfect snack for spice lovers who want that extra kick.',
    rating: 4.5,
  },
  {
    id: 7,
    name: 'Jalapeño Cheese Poppers',
    price: 6.99,
    category: 'spicy',
    description:
      'Fresh jalapeños stuffed with cream cheese and wrapped in crispy breading. A crowd favorite with just the right amount of heat.',
    rating: 4.7,
  },
  {
    id: 8,
    name: 'Chipotle Salsa Verde',
    price: 5.49,
    priceOld: 6.99,
    category: 'spicy',
    description:
      'Smoky chipotle peppers blended with fresh tomatillos and herbs. Perfect for dipping or cooking. Medium heat level.',
    rating: 4.6,
  },

  // Ice Cream Category
  {
    id: 9,
    name: 'Premium Mint Chocolate Chip',
    price: 7.99,
    category: 'ice-cream',
    description:
      'Creamy mint ice cream with rich dark chocolate chips. Made with real mint extract and Belgian chocolate for an authentic taste.',
    rating: 4.8,
  },
  {
    id: 10,
    name: 'Classic Vanilla Bean',
    price: 6.49,
    priceOld: 8.49,
    category: 'ice-cream',
    description:
      'Traditional vanilla ice cream made with Madagascar vanilla beans. Simple, elegant, and pairs perfectly with any dessert.',
    rating: 4.7,
  },
  {
    id: 11,
    name: 'Fresh Strawberry Swirl',
    price: 7.49,
    category: 'ice-cream',
    description:
      'Smooth strawberry ice cream with ribbons of real strawberry puree. Made with locally sourced berries for maximum flavor.',
    rating: 4.9,
  },
  {
    id: 12,
    name: 'Double Dark Chocolate',
    price: 8.99,
    priceOld: 10.99,
    category: 'ice-cream',
    description:
      "Decadent chocolate ice cream with cocoa powder and dark chocolate chunks. A chocolate lover's dream come true.",
    rating: 5.0,
  },
  {
    id: 13,
    name: 'Salted Caramel Fudge',
    price: 7.99,
    category: 'ice-cream',
    description:
      'Rich caramel ice cream with swirls of fudge and a hint of sea salt. The perfect balance of sweet and salty flavors.',
    rating: 4.8,
  },
  {
    id: 14,
    name: 'Pistachio Almond Crunch',
    price: 9.49,
    category: 'ice-cream',
    description:
      'Sophisticated pistachio ice cream with roasted almond pieces. Made with real pistachios for an authentic nutty flavor.',
    rating: 4.6,
  },
];

export const getProductById = (id: number): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const getProductsByCategory = (
  category: Product['category'],
): Product[] => {
  return products.filter((product) => product.category === category);
};

export const getRelatedProducts = (
  productId: number,
  limit: number = 4,
): Product[] => {
  const product = getProductById(productId);
  if (!product) return [];

  return products
    .filter((p) => p.id !== productId && p.category === product.category)
    .slice(0, limit);
};
