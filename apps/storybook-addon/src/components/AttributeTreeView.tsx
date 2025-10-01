import React, { useState } from 'react';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';
import type { AttributeNode } from '../types';
import type { WalkerOS } from '@walkeros/core';

// Utility to format complex values for display in badges
const formatValueForBadge = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length <= 3
        ? value.join(', ')
        : `${value.slice(0, 3).join(', ')}...`;
    }
    // For objects, show the actual keys instead of just the count
    const keys = Object.keys(value);
    if (keys.length === 0) return '';
    if (keys.length <= 3) {
      return keys.join(', ');
    }
    return `${keys.slice(0, 3).join(', ')}...`;
  }
  return String(value);
};

interface AttributeTreeViewProps {
  tree: AttributeNode[];
  depth?: number;
}

interface AttributeBadgeProps {
  type: 'entity' | 'action' | 'context' | 'globals' | 'data';
  label: string;
  value?: string;
}

const AttributeBadge: React.FC<AttributeBadgeProps> = ({
  type,
  label,
  value,
}) => {
  const colors = {
    entity: '#00ca4e',
    action: '#9900ff',
    context: '#ffbd44',
    globals: '#4fc3f7',
    data: '#ff605c',
  };

  const displayText = value ? `${label}: ${value}` : label;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        margin: '0 4px',
        fontSize: '14px',
        color: 'black',
        backgroundColor: colors[type],
        borderRadius: '3px',
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={displayText}
    >
      <span>
        {type === 'data' ? (
          value ? (
            <>
              <strong>{label}:</strong> {value}
            </>
          ) : (
            <strong>{label}</strong>
          )
        ) : (
          <>
            <strong>{type}:</strong> {displayText}
          </>
        )}
      </span>
    </span>
  );
};

const AttributeNodeComponent: React.FC<{
  node: AttributeNode;
  depth: number;
}> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const theme = useTheme();

  const hasAttributes =
    node.attributes.entity ||
    node.attributes.action ||
    node.attributes.context ||
    node.attributes.globals ||
    node.attributes.properties;

  const hasChildren = node.children.length > 0;

  return (
    <div
      style={{
        marginLeft: depth * 16,
        borderLeft: depth > 0 ? `1px solid ${theme.color.border}` : 'none',
        paddingLeft: depth > 0 ? '8px' : '0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 0',
        }}
      >
        {hasChildren ? (
          <span
            style={{
              marginRight: '8px',
              color: theme.color.mediumdark,
              cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-block',
              width: '12px',
              textAlign: 'center',
            }}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span
            style={{
              marginRight: '8px',
              width: '12px',
              display: 'inline-block',
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: hasAttributes ? 'pointer' : 'default',
            flex: 1,
          }}
          onClick={
            hasAttributes ? () => setShowDetails(!showDetails) : undefined
          }
        >
          {node.attributes.entity && (
            <AttributeBadge type="entity" label={node.attributes.entity} />
          )}

          {node.attributes.action && (
            <AttributeBadge type="action" label={node.attributes.action} />
          )}

          {node.attributes.context &&
            Object.keys(node.attributes.context).length > 0 && (
              <AttributeBadge
                key="context"
                type="context"
                label={Object.keys(node.attributes.context).join(', ')}
              />
            )}

          {node.attributes.globals &&
            Object.keys(node.attributes.globals).length > 0 && (
              <AttributeBadge
                key="globals"
                type="globals"
                label={Object.keys(node.attributes.globals).join(', ')}
              />
            )}

          {node.attributes.properties &&
            (() => {
              const properties = node.attributes.properties;
              const validEntries = Object.entries(properties).filter(
                ([key, value]) => {
                  // Skip empty objects and null/undefined values
                  if (
                    typeof value === 'object' &&
                    value !== null &&
                    Object.keys(value).length === 0
                  )
                    return false;
                  return value !== null && value !== undefined && value !== '';
                },
              );

              return validEntries.map(([key, value]) => {
                // If key is empty/generic, name it "generic", otherwise use "data-{key}"
                const displayLabel = key ? `data-${key}` : 'data-generic';
                const displayValue = formatValueForBadge(value);
                return (
                  <AttributeBadge
                    key={`data-${key}`}
                    type="data"
                    label={displayLabel}
                    value={displayValue}
                  />
                );
              });
            })()}
        </div>
      </div>

      {showDetails && hasAttributes && node.htmlMarkup && (
        <div
          style={{ marginTop: '8px', marginBottom: '8px', textAlign: 'left' }}
        >
          <SyntaxHighlighter
            language="html"
            copyable={true}
            bordered={true}
            padded={true}
          >
            {node.htmlMarkup}
          </SyntaxHighlighter>
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <AttributeNodeComponent
              key={index}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AttributeTreeView: React.FC<AttributeTreeViewProps> = ({
  tree,
  depth = 0,
}) => {
  const theme = useTheme();

  if (tree.length === 0) {
    return (
      <div
        style={{
          color: theme.color.mediumdark,
          padding: '20px',
        }}
      >
        No walker attributes found
        <br />
        <small>
          Make sure your components have walker attributes like data-elb,
          data-elbaction, etc.
        </small>
      </div>
    );
  }

  return (
    <div>
      {tree.map((node, index) => (
        <AttributeNodeComponent key={index} node={node} depth={depth} />
      ))}
    </div>
  );
};
