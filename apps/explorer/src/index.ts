// Ready-to-use demos
export {
  DestinationDemo,
  createCaptureFn,
} from './components/demos/DestinationDemo';
export { DestinationInitDemo } from './components/demos/DestinationInitDemo';
export { PromotionPlayground } from './components/demos/PromotionPlayground';
export type { DestinationDemoProps } from './components/demos/DestinationDemo';
export type { DestinationInitDemoProps } from './components/demos/DestinationInitDemo';
export type { PromotionPlaygroundProps } from './components/demos/PromotionPlayground';

// Alias for backward compatibility with website
export { DestinationDemo as DestinationPush } from './components/demos/DestinationDemo';
export { DestinationInitDemo as DestinationInit } from './components/demos/DestinationInitDemo';

// Organisms
export { LiveCode } from './components/organisms/live-code';
export { CollectorBox } from './components/organisms/collector-box';
export { BrowserBox } from './components/organisms/browser-box';
export type { LiveCodeProps } from './components/organisms/live-code';
export type { CollectorBoxProps } from './components/organisms/collector-box';
export type { BrowserBoxProps } from './components/organisms/browser-box';

// Molecules
export { ArchitectureFlow } from './components/molecules/architecture-flow';
export { CodeBox } from './components/molecules/code-box';
export { CodeSnippet } from './components/molecules/code-snippet';
export { FlowMap } from './components/molecules/flow-map';
export { PropertyTable } from './components/molecules/property-table';
export {
  Dropdown,
  DropdownItem,
  DropdownDivider,
} from './components/molecules/dropdown';
export type {
  ArchitectureFlowProps,
  FlowColumn,
  FlowSection,
  FlowItem,
} from './components/molecules/architecture-flow';
export type { CodeBoxProps, CodeBoxTab } from './components/molecules/code-box';
export type { CodeSnippetProps } from './components/molecules/code-snippet';
export type {
  FlowMapProps,
  FlowStageConfig,
} from './components/molecules/flow-map';
export type { PropertyTableProps } from './components/molecules/property-table';
export type {
  DropdownProps,
  DropdownItemProps,
  DropdownDividerProps,
} from './components/molecules/dropdown';

export { Preview } from './components/molecules/preview';
export type { PreviewProps } from './components/molecules/preview';

// Atoms
export { Code } from './components/atoms/code';
export { Box } from './components/atoms/box';
export { Grid } from './components/atoms/grid';
export { Header } from './components/atoms/header';
export { Footer } from './components/atoms/footer';
export { Button } from './components/atoms/button';
export { ButtonGroup } from './components/atoms/button-group';
export { ButtonLink } from './components/atoms/button-link';
export { Spinner } from './components/atoms/spinner';

export { Icon } from './components/atoms/icons';
export type { CodeProps } from './components/atoms/code';
export type { BoxProps, BoxTab } from './components/atoms/box';
export type { GridProps } from './components/atoms/grid';
export type { HeaderProps } from './components/atoms/header';
export type { FooterProps } from './components/atoms/footer';
export type { ButtonProps } from './components/atoms/button';
export type { ButtonGroupProps } from './components/atoms/button-group';
export type { ButtonLinkProps } from './components/atoms/button-link';
export type { SpinnerProps } from './components/atoms/spinner';

// MDX Integration
export { MDXProvider } from './providers/MDXProvider';
export { MDXCode } from './components/atoms/mdx-code';

// Utility
export { cn } from './lib/utils';

// Hooks
export { useDropdown } from './hooks/useDropdown';
export type { UseDropdownReturn } from './hooks/useDropdown';

// Monaco Editor themes
export {
  palenightTheme,
  lighthouseTheme,
  registerPalenightTheme,
  registerLighthouseTheme,
  registerAllThemes,
} from './themes';
export type { ExplorerTheme } from './themes';

// Monaco Editor type registration
export {
  registerWalkerOSTypes,
  initializeMonacoTypes,
  loadPackageTypes,
  loadTypeLibraryFromURL,
} from './utils/monaco-types';
export type { LoadPackageTypesOptions } from './utils/monaco-types';

// Monaco JSON Schema registry
export {
  registerJsonSchema,
  unregisterJsonSchema,
  generateModelPath,
} from './utils/monaco-json-schema';

// Schema enrichment
export {
  enrichSchema,
  type MonacoSchemaExtension,
} from './utils/monaco-schema-enrichment';
export { enrichFlowConfigSchema } from './utils/monaco-schema-flow-config';
export { getEnrichedContractSchema } from './utils/monaco-schema-contract';
export { getVariablesSchema } from './utils/monaco-schema-variables';

// walkerOS reference decorations
export {
  findWalkerOSReferences,
  applyWalkerOSDecorations,
  registerWalkerOSDecorationStyles,
  REFERENCE_PATTERNS,
} from './utils/monaco-walkeros-decorations';

// IntelliSense types
export type { IntelliSenseContext, PackageInfo } from './types/intellisense';

// IntelliSense providers
export {
  registerWalkerOSProviders,
  disposeWalkerOSProviders,
  setIntelliSenseContext,
  removeIntelliSenseContext,
} from './utils/monaco-walkeros-providers';
export { validateWalkerOSReferences } from './utils/monaco-walkeros-markers';
export { extractFlowIntelliSenseContext } from './utils/monaco-intellisense-flow-extractor';

// Destination helpers
export {
  createGtagDestination,
  createFbqDestination,
  createPlausibleDestination,
} from './helpers/destinations';

// Capture utilities for destination demos (captureDestinationPush still exported for DestinationDemo)
export {
  captureDestinationPush,
  formatCapturedCalls,
  createRawCapture,
} from './helpers/capture';
