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
export { Preview } from './components/molecules/preview';
export { CodeEditor } from './components/molecules/code-editor';
export { CodePanel } from './components/molecules/code-panel';
export { HtmlPreview } from './components/molecules/html-preview';
export type { BoxProps } from './components/atoms/box';
export type { PanelHeaderProps } from './components/atoms/panel-header';
export type { PreviewProps } from './components/molecules/preview';
export type { HtmlPreviewProps } from './components/molecules/html-preview';
