/** Where a Tag Mode script comes from and whose message may request it. */
export interface MoinTarget {
  /** The app origin whose message is trusted, compared with `===`. */
  app: string;
  /** The script base URL, ending in `/`. */
  base: string;
}

/** The link parameter that arms the loader; its value is ignored. */
export const MOIN_PARAM = 'elbMoin';

export const MOIN_PRODUCTION: MoinTarget = {
  app: 'https://app.walkeros.io',
  base: 'https://cdn.walkeros.io/tag-mode/',
};
