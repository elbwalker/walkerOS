// Open Air site components.
//
// Separate entry point from the root export on purpose: marketing and
// communication pages compose from here and never pull the tool-side module
// graph (Monaco, RJSF) through their bundler.
//
//   import { Badge, SectionHead } from '@walkeros/explorer/site';
//   import '@walkeros/explorer/site.css';

export { Badge } from './badge';
export type { BadgeProps } from './badge';

export { SiteButton, ButtonRow } from './button';
export type {
  SiteButtonProps,
  SiteButtonVariant,
  ButtonRowProps,
} from './button';

export { SectionHead } from './section-head';
export type { SectionHeadProps } from './section-head';

export { SplitSection, Panel } from './split-section';
export type { SplitSectionProps, PanelProps } from './split-section';

export { CodePanel } from './code-panel';
export type { CodePanelProps, EntityActionPair } from './code-panel';

export { ProofGrid } from './proof-grid';
export type { ProofGridProps, Proof } from './proof-grid';

export { LimitsBlock } from './limits-block';
export type { LimitsBlockProps } from './limits-block';
