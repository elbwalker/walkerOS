import { createTagger } from '@walkeros/web-source-browser';

/**
 * walkeros.io's tagging attributes, read by the site's own walkerOS flow
 * (prefix data-alst). Use it for every tag: hand-written attribute names are
 * easy to get wrong in a way walkerOS silently ignores.
 */
export const tagger = createTagger({ prefix: 'data-alst' });
