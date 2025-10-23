import type { UseMappingStateReturn } from '../../hooks/useMappingState';
import type { UseMappingNavigationReturn } from '../../hooks/useMappingNavigation';
import {
  MappingFunctionPaneBase,
  type HelpSection,
} from './mapping-function-pane-base';

/**
 * Mapping Fn Pane View
 *
 * Dedicated pane for the 'fn' property - a transformation function that
 * processes event data and returns a transformed value.
 *
 * Function signature: (value, mapping, options) => any
 */
export interface MappingFnPaneViewProps {
  path: string[];
  mappingState: UseMappingStateReturn;
  navigation: UseMappingNavigationReturn;
  className?: string;
}

const DEFAULT_FN = `(value, mapping, options) => {
  // Transform and return the value
  // Access event data: value.data, value.user, value.globals
  // Access collector: options.collector
  return value.data;
}`;

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Parameters',
    items: [
      {
        code: 'value',
        description: 'The event or current value being processed',
      },
      {
        code: 'mapping',
        description: 'The mapping configuration for this property',
      },
      {
        code: 'options',
        description: 'Additional options',
      },
    ],
  },
  {
    title: 'Return Value',
    items: [
      {
        code: 'any',
        description:
          'Return the transformed value (string, number, object, array)',
      },
      {
        code: 'undefined',
        description: 'Return undefined to skip this property',
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
        label: 'Extract nested property:',
        code: <>(value) =&gt; value.data?.product?.id</>,
      },
      {
        label: 'Format currency:',
        code: (
          <>
            (value) =&gt; &#123;{'\n'}
            {'  '}const price = value.data?.price || 0;{'\n'}
            {'  '}return price.toFixed(2);{'\n'}
            &#125;
          </>
        ),
      },
      {
        label: 'Combine multiple fields:',
        code: (
          <>
            (value) =&gt; `$&#123;value.data?.firstName&#125;
            $&#123;value.data?.lastName&#125;`
          </>
        ),
      },
      {
        label: 'Conditional transformation with consent:',
        code: (
          <>
            (value, mapping, options) =&gt; &#123;{'\n'}
            {'  '}if (options.consent?.marketing) &#123;{'\n'}
            {'    '}return value.user?.email;{'\n'}
            {'  '}&#125;{'\n'}
            {'  '}return undefined;{'\n'}
            &#125;
          </>
        ),
      },
      {
        label: 'Use collector for context:',
        code: (
          <>
            (value, mapping, options) =&gt; &#123;{'\n'}
            {'  '}const sessionId = options.collector?.session?.id;{'\n'}
            {'  '}return &#123;{'\n'}
            {'    '}eventId: value.id,{'\n'}
            {'    '}sessionId: sessionId,{'\n'}
            {'  '}&#125;;{'\n'}
            &#125;
          </>
        ),
      },
    ],
  },
];

export function MappingFnPaneView(props: MappingFnPaneViewProps) {
  return (
    <MappingFunctionPaneBase
      title="Transformation Function"
      description="Transform event data before sending to destination"
      defaultCode={DEFAULT_FN}
      helpSections={HELP_SECTIONS}
      {...props}
    />
  );
}
