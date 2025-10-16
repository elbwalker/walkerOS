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
export { CodePanel } from './components/organisms/code-panel';
export { CollectorBox } from './components/organisms/collector-box';
export { BrowserBox } from './components/organisms/browser-box';
export type { LiveCodeProps } from './components/organisms/live-code';
export type { CodePanelProps } from './components/organisms/code-panel';
export type { CollectorBoxProps } from './components/organisms/collector-box';
export type { BrowserBoxProps } from './components/organisms/browser-box';

// Molecules
export { Preview } from './components/molecules/preview';
export { CodeEditor } from './components/molecules/code-editor';
export type { PreviewProps } from './components/molecules/preview';
export type { CodeEditorProps } from './components/molecules/code-editor';

// Atoms
export { Box } from './components/atoms/box';
export { Header } from './components/atoms/header';
export { Button } from './components/atoms/button';
export { ButtonGroup } from './components/atoms/button-group';
export type { BoxProps } from './components/atoms/box';
export type { HeaderProps } from './components/atoms/header';
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
