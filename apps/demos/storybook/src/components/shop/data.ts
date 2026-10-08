// The shop's content, carried over from the static tagging demo
// (apps/demos/tagging/index.html): products, prices, ids and the catalog the
// "Add product" button draws from.

/** A value shown to people beside the value the tag carries. */
export interface Labelled {
  value: string;
  label: string;
}

export interface Product {
  name: string;
  price: number;
  id?: string;
  flag?: Labelled;
  imageAlt?: string;
}

export interface CartItem {
  name: string;
  color: Labelled;
  size: Labelled;
  price: number;
  currency: string;
  imageAlt: string;
}

export interface SummaryLine {
  label: string;
  property: string;
  amount: number;
  currency?: string;
  emphasis?: boolean;
}

/** A navigation link: its label and the page section it scrolls to. */
export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
  { label: 'Promotion', href: '#promotion' },
  { label: 'Recommendations', href: '#recommendations' },
  { label: 'Product', href: '#product' },
  { label: 'Checkout', href: '#checkout' },
  { label: 'Order', href: '#order' },
];

export const headerGlobals = {
  language: 'en',
  languageLabel: 'EN',
  cartValue: 249,
};

/** A call to action: its label and the action its click fires. */
export interface CallToAction {
  label: string;
  action: string;
}

export interface PromotionContent {
  name: string;
  text: string;
  category: string;
  primaryCta: CallToAction;
  secondaryCta: CallToAction;
}

export const promotion: PromotionContent = {
  name: 'Setting up tracking easily',
  text: 'Open your console to see how we measure.',
  category: 'analytics',
  primaryCta: { label: 'Get started', action: 'start' },
  secondaryCta: { label: 'Learn more', action: 'more' },
};

const recommendationAlt =
  'Front of zip tote bag with white canvas, black canvas straps and handle, and black zipper pulls.';

export const recommendations: Product[] = [
  {
    name: 'Everyday Ruck Snack',
    price: 210,
    imageAlt: recommendationAlt,
  },
  { name: 'Party pants', price: 217, imageAlt: recommendationAlt },
  {
    name: 'Cool Cap',
    price: 39,
    flag: { value: 'schnapper', label: 'Schnapper' },
    imageAlt: recommendationAlt,
  },
  { name: 'Hoodie', price: 59, imageAlt: recommendationAlt },
];

export const demoCatalog: Array<{ name: string; price: number }> = [
  { name: 'Sunny Sneakers', price: 89 },
  { name: 'Cosy Hoodie', price: 59 },
  { name: 'Trail Bottle', price: 24 },
  { name: 'Desk Lamp', price: 45 },
  { name: 'Canvas Tote', price: 32 },
  { name: 'Wool Socks', price: 14 },
];

/**
 * The product the static demo's addProduct() appends as its `count`th one
 * (1-based): it cycles through the catalog and numbers name and id.
 */
export function createDemoProduct(count: number): Product {
  const index = (count - 1) % demoCatalog.length;
  const item = demoCatalog[index];
  const name = `${item.name} #${count}`;
  return {
    id: `P${1000 + count}`,
    name,
    price: item.price,
    imageAlt: name,
  };
}

export interface ProductDetailContent {
  id: string;
  name: string;
  category: string[];
  price: number;
  currency: string;
  rating: number;
  reviews: number;
  availability: Labelled;
  description: string;
  guarantee: string;
  imageAlt: string;
}

export const productDetail: ProductDetailContent = {
  id: 'rcksnck',
  name: 'Everyday Ruck Snack',
  category: ['Travel', 'Bags'],
  price: 210,
  currency: 'EUR',
  rating: 4,
  reviews: 1624,
  availability: {
    value: 'in_stock',
    label: 'In stock and ready to ship',
  },
  description:
    "Don't compromise on snack-carrying capacity with this lightweight and spacious bag. The drawstring top keeps all your favorite chips, crisps, fries, biscuits, crackers, and cookies secure.",
  guarantee: 'Lifetime Guarantee',
  imageAlt:
    'Model wearing light green backpack with black canvas straps and front zipper pouch.',
};

export const checkoutFields = {
  countries: ['United States', 'Canada', 'Mexico'],
};

// The cart: 210 + 39 makes the header's cart value of 249.
export const cartItems: CartItem[] = [
  {
    name: 'Everyday Ruck Snack',
    color: { value: 'black', label: 'Black' },
    size: { value: 'large', label: 'Large' },
    price: 210,
    currency: 'EUR',
    imageAlt: "Front of men's Everyday Ruck Snack in black.",
  },
  {
    name: 'Cool Cap',
    color: { value: 'green', label: 'Green' },
    size: { value: 'onesize', label: 'One-Size' },
    price: 39,
    currency: 'EUR',
    imageAlt: "Front of men's Cool Cap in green.",
  },
];

export const checkoutSummary: SummaryLine[] = [
  { label: 'Subtotal', property: 'subtotal', amount: 249, currency: 'EUR' },
  { label: 'Shipping', property: 'shipping', amount: 5, currency: 'EUR' },
  { label: 'Taxes', property: 'taxes', amount: 5.52, currency: 'EUR' },
  {
    label: 'Total',
    property: 'total',
    amount: 259.52,
    currency: 'EUR',
    emphasis: true,
  },
];

// The completed order is the cart, checked out.
export const orderItems: CartItem[] = cartItems;

export interface OrderContent {
  id: string;
  status: string;
  title: string;
  text: string;
  trackingNumber: string;
  summary: SummaryLine[];
  address: { lines: string[]; city: string; country: string };
  payment: { brand: string; ending: string; expires: string };
}

export const order: OrderContent = {
  id: '0rd3r1d',
  status: 'Payment successful',
  title: 'Thanks for ordering',
  text: "We appreciate your order, we're currently processing it. So hang tight and we'll send you confirmation very soon!",
  trackingNumber: '51547878755545848512',
  summary: [
    { label: 'Subtotal', property: 'subtotal', amount: 249, currency: 'EUR' },
    { label: 'Shipping', property: 'shipping', amount: 5 },
    { label: 'Taxes', property: 'taxes', amount: 5.52 },
    { label: 'Total', property: 'total', amount: 259.52, emphasis: true },
  ],
  address: {
    lines: ['elbwalker GmbH', 'Gerhofstraße 1-3'],
    city: '20354 Hamburg',
    country: 'Germany',
  },
  payment: { brand: 'Visa', ending: '1337', expires: '12 / 42' },
};

export const footerLinks = [
  'About',
  'Blog',
  'Jobs',
  'Press',
  'Accessibility',
  'Partners',
];

export const copyright = '© 2024 Your Company, Inc. All rights reserved.';
