import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import {
  MappingFunctionPaneBase,
  type HelpSection,
} from './mapping-function-pane-base';

/**
 * Mapping Validate Pane View
 *
 * Dedicated pane for the 'validate' property - a validation function that
 * checks if a transformed value should be included.
 *
 * Function signature: (value?) => boolean
 * Returns true to include the value, false to exclude it.
 */
export interface MappingValidatePaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

const DEFAULT_VALIDATE = `(value) => {
  // Return true to include this value
  // Return false to exclude it
  return value !== undefined && value !== null && value !== '';
}`;

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Parameter',
    items: [
      {
        code: 'value',
        description: 'The transformed value to validate (optional)',
      },
    ],
  },
  {
    title: 'Return Value',
    items: [
      {
        code: 'true',
        description: 'Include this value in the result',
      },
      {
        code: 'false',
        description: 'Exclude this value (skip it)',
      },
      {
        code: 'Promise',
        description: 'Can be async (return Promise)',
      },
    ],
  },
  {
    title: 'Examples',
    examples: [
      {
        label: 'Exclude empty values:',
        code: (
          <>
            (value) =&gt; value !== undefined && value !== null && value !== ''
          </>
        ),
      },
      {
        label: 'Only include valid email addresses:',
        code: (
          <>
            (value) =&gt; typeof value === 'string' &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          </>
        ),
      },
      {
        label: 'Only include positive numbers:',
        code: <>(value) =&gt; typeof value === 'number' && value &gt; 0</>,
      },
      {
        label: 'Validate URL format:',
        code: (
          <>
            (value) =&gt; &#123;{'\n'}
            {'  '}try &#123;{'\n'}
            {'    '}new URL(value);{'\n'}
            {'    '}return true;{'\n'}
            {'  '}&#125; catch &#123;{'\n'}
            {'    '}return false;{'\n'}
            {'  '}&#125;{'\n'}
            &#125;
          </>
        ),
      },
      {
        label: 'Exclude specific values:',
        code: (
          <>
            (value) =&gt; !['test', 'localhost', 'example.com'].includes(value)
          </>
        ),
      },
    ],
  },
];

export function MappingValidatePaneView(props: MappingValidatePaneViewProps) {
  return (
    <MappingFunctionPaneBase
      title="Validation Function"
      description="Validate if the transformed value should be included"
      defaultCode={DEFAULT_VALIDATE}
      helpSections={HELP_SECTIONS}
      {...props}
    />
  );
}
