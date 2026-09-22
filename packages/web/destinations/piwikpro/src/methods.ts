export type MethodName =
  | 'trackPageView'
  | 'trackEvent'
  | 'trackGoal'
  | 'trackSiteSearch'
  | 'trackLink'
  | 'trackContentImpression'
  | 'trackContentInteraction'
  | 'ecommerceProductDetailView'
  | 'ecommerceAddToCart'
  | 'ecommerceRemoveFromCart'
  | 'ecommerceCartUpdate'
  | 'ecommerceOrder'
  | 'ping';

/** The portable Piwik PRO JS methods, the ones a server hit can be built from too. */
export const METHOD_NAMES: readonly MethodName[] = [
  'trackPageView',
  'trackEvent',
  'trackGoal',
  'trackSiteSearch',
  'trackLink',
  'trackContentImpression',
  'trackContentInteraction',
  'ecommerceProductDetailView',
  'ecommerceAddToCart',
  'ecommerceRemoveFromCart',
  'ecommerceCartUpdate',
  'ecommerceOrder',
  'ping',
];

export function isMethodName(name: string): name is MethodName {
  return METHOD_NAMES.some((method) => method === name);
}

/** Index of the dimensions argument, or undefined when the method has none. */
export const DIMENSIONS_ARG: Partial<Record<MethodName, number>> = {
  trackEvent: 4,
  trackGoal: 2,
  trackSiteSearch: 3,
  trackLink: 2,
};
