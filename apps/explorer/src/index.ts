// Ready-to-use demos
export { MappingDemo } from './components/demos/MappingDemo';
export { MappingCode } from './components/demos/MappingCode';
export {
  DestinationDemo,
  createCaptureFn,
} from './components/demos/DestinationDemo';
export type { MappingDemoProps } from './components/demos/MappingDemo';
export type { MappingCodeProps } from './components/demos/MappingCode';
export type { DestinationDemoProps } from './components/demos/DestinationDemo';

// Alias for backward compatibility with website
export { DestinationDemo as DestinationPush } from './components/demos/DestinationDemo';

// Main components
export { LiveCode } from './components/organisms/live-code';
export type { LiveCodeProps } from './components/organisms/live-code';

// Utility
export { cn } from './lib/utils';

// Sub-components
export { Button } from './components/ui/button';
export { CodeEditor } from './components/molecules/code-editor';
export { CodePanel } from './components/molecules/code-panel';
