import type { MappingState } from '../../hooks/useMappingState';
import type { UseMappingNavigation } from '../../hooks/useMappingNavigation';
import {
  MappingFunctionPaneBase,
  type HelpSection,
} from './mapping-function-pane-base';

/**
 * Mapping Condition Pane View
 *
 * Dedicated pane for the 'condition' property - a function that determines
 * if the mapping rule should apply to an event.
 *
 * Returns true to apply the rule, false to skip it.
 */
export interface MappingConditionPaneViewProps {
  path: string[];
  mappingState: MappingState;
  navigation: UseMappingNavigation;
  className?: string;
}

const DEFAULT_CONDITION = `(value, mapping, collector) => {
  // Return true to apply this rule
  return true;
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
        description: 'The mapping configuration',
      },
      {
        code: 'collector',
        description: 'The collector instance',
      },
    ],
  },
  {
    title: 'Return Value',
    items: [
      {
        code: 'true',
        description: 'Apply this mapping rule',
      },
      {
        code: 'false',
        description: 'Skip this mapping rule',
      },
    ],
  },
  {
    title: 'Examples',
    examples: [
      {
        label: 'Only for high-value orders:',
        code: <>(value) =&gt; value.data?.total &gt; 100</>,
      },
      {
        label: 'Only for specific user segment:',
        code: <>(value) =&gt; value.user?.segment === 'premium'</>,
      },
      {
        label: 'Only during business hours:',
        code: (
          <>
            () =&gt; new Date().getHours() &gt;= 9 && new Date().getHours() &lt;
            17
          </>
        ),
      },
    ],
  },
];

export function MappingConditionPaneView(props: MappingConditionPaneViewProps) {
  return (
    <MappingFunctionPaneBase
      title="Condition Function"
      description="Define when this mapping rule should apply to an event"
      defaultCode={DEFAULT_CONDITION}
      helpSections={HELP_SECTIONS}
      {...props}
    />
  );
}
