// Ready-to-use demos
export { MappingDemo } from './components/demos/MappingDemo';
export { MappingCode } from './components/demos/MappingCode';
export {
  DestinationDemo,
  createCaptureFn,
} from './components/demos/DestinationDemo';
export { PromotionPlayground } from './components/demos/PromotionPlayground';
export type { MappingDemoProps } from './components/demos/MappingDemo';
export type { MappingCodeProps } from './components/demos/MappingCode';
export type { DestinationDemoProps } from './components/demos/DestinationDemo';
export type { PromotionPlaygroundProps } from './components/demos/PromotionPlayground';

// Alias for backward compatibility with website
export { DestinationDemo as DestinationPush } from './components/demos/DestinationDemo';

// Organisms
export { LiveCode } from './components/organisms/live-code';
export { CodeBox } from './components/organisms/code-box';
export { CollectorBox } from './components/organisms/collector-box';
export { BrowserBox } from './components/organisms/browser-box';
export type { LiveCodeProps } from './components/organisms/live-code';
export type { CodeBoxProps } from './components/organisms/code-box';
export type { CollectorBoxProps } from './components/organisms/collector-box';
export type { BrowserBoxProps } from './components/organisms/browser-box';

// Molecules
export { Preview } from './components/molecules/preview';
export type { PreviewProps } from './components/molecules/preview';

// Atoms
export { Box } from './components/atoms/box';
export { Grid } from './components/atoms/grid';
export { Header } from './components/atoms/header';
export { Footer } from './components/atoms/footer';
export { Button } from './components/atoms/button';
export { ButtonGroup } from './components/atoms/button-group';
export type { BoxProps } from './components/atoms/box';
export type { GridProps } from './components/atoms/grid';
export type { HeaderProps } from './components/atoms/header';
export type { FooterProps } from './components/atoms/footer';
export type { ButtonProps } from './components/atoms/button';
export type { ButtonGroupProps } from './components/atoms/button-group';

// Utility
export { cn } from './lib/utils';

// Destination helpers
export {
  createGtagDestination,
  createFbqDestination,
  createPlausibleDestination,
} from './helpers/destinations';
