// Import the original mapper
import MDXComponents from '@theme-original/MDXComponents';
import Link from '@docusaurus/Link';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { Icon } from '@iconify/react';
// Import explorer components (made available in all MDX files)
import {
  CodeBox,
  CodeSnippet,
  PropertyTable,
  DestinationInitDemo,
  DestinationDemo,
  LiveCode,
  FlowMap,
} from '@walkeros/explorer';
// Import website-specific components
import PackageLink from '@site/src/components/docs/package-link';

export default {
  // Re-use the default mapping
  ...MDXComponents,
  // Docusaurus components
  Link,
  Tabs,
  TabItem,
  // Custom components
  Icon,
  PackageLink,
  // Explorer components (no import needed in MDX files)
  CodeBox,
  CodeSnippet,
  PropertyTable,
  DestinationInitDemo,
  DestinationDemo,
  LiveCode,
  FlowMap,
};
