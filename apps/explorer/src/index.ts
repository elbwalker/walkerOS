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

// Main components
export { LiveCode } from './components/organisms/live-code';
export type { LiveCodeProps } from './components/organisms/live-code';

// Utility
export { cn } from './lib/utils';

// Atomic components
export { Button } from './components/ui/button';
export { Box } from './components/atoms/box';
export { PanelHeader } from './components/atoms/panel-header';
export { HeaderButton } from './components/atoms/header-button';
export { Preview } from './components/molecules/preview';
export { CodeEditor } from './components/molecules/code-editor';
export { CodePanel } from './components/molecules/code-panel';
export { CollectorBox } from './components/molecules/collector-box';
export { ButtonGroup } from './components/molecules/button-group';
export { BrowserBox } from './components/molecules/browser-box';
export { HtmlPreview } from './components/molecules/html-preview';
export type { BoxProps } from './components/atoms/box';
export type { PanelHeaderProps } from './components/atoms/panel-header';
export type { HeaderButtonProps } from './components/atoms/header-button';
export type { PreviewProps } from './components/molecules/preview';
export type { CollectorBoxProps } from './components/molecules/collector-box';
export type { ButtonGroupProps } from './components/molecules/button-group';
export type { BrowserBoxProps } from './components/molecules/browser-box';
export type { HtmlPreviewProps } from './components/molecules/html-preview';

// Destination helpers
export {
  createGtagDestination,
  createFbqDestination,
  createPlausibleDestination,
} from './helpers/destinations';
