import { useState, useRef, useEffect } from 'react';
import type { Mapping } from '@walkeros/core';

/**
 * Tree node representation
 */
export interface TreeNode {
  path: string[];
  label: string;
  type: 'root' | 'entity' | 'rule' | 'property' | 'nested';
  valueType?:
    | 'map'
    | 'loop'
    | 'fn'
    | 'set'
    | 'key'
    | 'value'
    | 'condition'
    | 'validate'
    | 'consent';
  children?: TreeNode[];
  isExpandable: boolean;
}

/**
 * Helper to add optional ValueConfig properties (condition, validate, consent) to a node's children
 */
function addOptionalPropertiesToChildren(
  valueRecord: Record<string, unknown>,
  propertyPath: string[],
  children: TreeNode[],
): void {
  // Add condition property node
  if ('condition' in valueRecord) {
    children.push({
      path: [...propertyPath, 'condition'],
      label: 'condition',
      type: 'nested',
      valueType: 'condition',
      children: [],
      isExpandable: false,
    });
  }

  // Add validate property node
  if ('validate' in valueRecord) {
    children.push({
      path: [...propertyPath, 'validate'],
      label: 'validate',
      type: 'nested',
      valueType: 'validate',
      children: [],
      isExpandable: false,
    });
  }

  // Add consent property node
  if ('consent' in valueRecord) {
    children.push({
      path: [...propertyPath, 'consent'],
      label: 'consent',
      type: 'nested',
      valueType: 'consent',
      children: [],
      isExpandable: false,
    });
  }
}

/**
 * Helper to build property tree recursively
 */
function buildPropertyTree(obj: unknown, basePath: string[]): TreeNode[] {
  if (!obj || typeof obj !== 'object') return [];

  const nodes: TreeNode[] = [];
  const record = obj as Record<string, unknown>;

  Object.keys(record)
    .sort()
    .forEach((key) => {
      const value = record[key];
      const propertyPath = [...basePath, key];

      // Check if this is a transformation type (map, loop, fn, set)
      if (typeof value === 'object' && value !== null) {
        const valueRecord = value as Record<string, unknown>;

        if ('map' in valueRecord) {
          // Add property node
          const propertyNode: TreeNode = {
            path: propertyPath,
            label: key,
            type: 'property',
            children: [],
            isExpandable: true,
          };

          // Add 'map' transformation node as child
          const mapObj = valueRecord.map as Record<string, unknown>;
          const mapPath = [...propertyPath, 'map'];
          const mapChildren = Object.keys(mapObj || {})
            .sort()
            .map((mapKey) => {
              const mapValue = mapObj[mapKey];
              let childValueType:
                | 'key'
                | 'value'
                | 'fn'
                | 'loop'
                | 'set'
                | undefined;

              // Detect child value type
              if (typeof mapValue === 'object' && mapValue !== null) {
                const mv = mapValue as Record<string, unknown>;
                if ('key' in mv) childValueType = 'key';
                else if ('fn' in mv) childValueType = 'fn';
                else if ('loop' in mv) childValueType = 'loop';
                else if ('set' in mv) childValueType = 'set';
                else if ('value' in mv) childValueType = 'value';
                else childValueType = 'value';
              } else {
                childValueType = 'value';
              }

              return {
                path: [...mapPath, mapKey],
                label: mapKey,
                type: 'nested' as const,
                valueType: childValueType,
                children: [],
                isExpandable: false,
              };
            });

          const mapNode: TreeNode = {
            path: mapPath,
            label: 'map',
            type: 'nested',
            valueType: 'map',
            children: mapChildren,
            isExpandable: mapChildren.length > 0,
          };

          propertyNode.children = [mapNode];

          // Add optional properties (condition, validate, consent)
          addOptionalPropertiesToChildren(
            valueRecord,
            propertyPath,
            propertyNode.children,
          );

          nodes.push(propertyNode);
        } else if ('loop' in valueRecord) {
          // Add property node with loop child
          const propertyNode: TreeNode = {
            path: propertyPath,
            label: key,
            type: 'property',
            children: [],
            isExpandable: true,
          };

          const loopNode: TreeNode = {
            path: [...propertyPath, 'loop'],
            label: 'loop',
            type: 'nested',
            valueType: 'loop',
            children: [],
            isExpandable: false,
          };

          propertyNode.children = [loopNode];

          // Add optional properties (condition, validate, consent)
          addOptionalPropertiesToChildren(
            valueRecord,
            propertyPath,
            propertyNode.children,
          );

          nodes.push(propertyNode);
        } else if ('fn' in valueRecord) {
          // Add property node with fn child
          const propertyNode: TreeNode = {
            path: propertyPath,
            label: key,
            type: 'property',
            children: [],
            isExpandable: true,
          };

          const fnNode: TreeNode = {
            path: [...propertyPath, 'fn'],
            label: 'fn',
            type: 'nested',
            valueType: 'fn',
            children: [],
            isExpandable: false,
          };

          propertyNode.children = [fnNode];

          // Add optional properties (condition, validate, consent)
          addOptionalPropertiesToChildren(
            valueRecord,
            propertyPath,
            propertyNode.children,
          );

          nodes.push(propertyNode);
        } else if ('set' in valueRecord) {
          // Add property node with set child
          const propertyNode: TreeNode = {
            path: propertyPath,
            label: key,
            type: 'property',
            children: [],
            isExpandable: true,
          };

          const setNode: TreeNode = {
            path: [...propertyPath, 'set'],
            label: 'set',
            type: 'nested',
            valueType: 'set',
            children: [],
            isExpandable: false,
          };

          propertyNode.children = [setNode];

          // Add optional properties (condition, validate, consent)
          addOptionalPropertiesToChildren(
            valueRecord,
            propertyPath,
            propertyNode.children,
          );

          nodes.push(propertyNode);
        } else if ('key' in valueRecord || 'value' in valueRecord) {
          // ValueConfig with key or value - check for optional properties
          const vType: 'key' | 'value' = 'key' in valueRecord ? 'key' : 'value';
          const children: TreeNode[] = [];

          // Add optional properties (condition, validate, consent)
          addOptionalPropertiesToChildren(valueRecord, propertyPath, children);

          nodes.push({
            path: propertyPath,
            label: key,
            type: 'property',
            valueType: vType,
            children,
            isExpandable: children.length > 0,
          });
        } else {
          // Regular object - might have nested properties
          const children = buildPropertyTree(value, propertyPath);

          nodes.push({
            path: propertyPath,
            label: key,
            type: 'property',
            children,
            isExpandable: children.length > 0,
          });
        }
      } else {
        // Simple value
        nodes.push({
          path: propertyPath,
          label: key,
          type: 'property',
          valueType: 'value' as const,
          children: [],
          isExpandable: false,
        });
      }
    });

  return nodes;
}

/**
 * Build tree structure from mapping config
 *
 * Pure utility function that transforms mapping config into tree structure.
 * Returns array of entity nodes (no root wrapper).
 * Now includes nested properties and map keys.
 */
export function buildTreeFromMapping(config: Mapping.Config): TreeNode[] {
  const entities: TreeNode[] = [];

  // Build entity and rule nodes
  const configRecord = config as Record<string, Record<string, unknown>>;
  Object.keys(config)
    .sort()
    .forEach((entity) => {
      const entityNode: TreeNode = {
        path: [entity],
        label: entity,
        type: 'entity',
        valueType: undefined,
        children: [],
        isExpandable: true,
      };

      const actions = configRecord[entity] as
        | Record<string, unknown>
        | undefined;
      if (actions && typeof actions === 'object') {
        Object.keys(actions)
          .sort()
          .forEach((action) => {
            const ruleConfig = actions[action] as Record<string, unknown>;

            // Build property tree for rule properties
            const properties = buildPropertyTree(ruleConfig, [entity, action]);

            const ruleNode: TreeNode = {
              path: [entity, action],
              label: action,
              type: 'rule',
              valueType: undefined,
              children: properties,
              isExpandable: properties.length > 0,
            };

            entityNode.children?.push(ruleNode);
          });
      }

      entities.push(entityNode);
    });

  return entities;
}

/**
 * Tree node component (recursive)
 */
interface TreeNodeComponentProps {
  node: TreeNode;
  expandedPaths: Set<string>;
  selectedPath: string[];
  onToggle: (path: string[]) => void;
  onSelect: (path: string[]) => void;
  onAddAction?: (entity: string, action: string) => void;
  level: number;
}

function TreeNodeComponent({
  node,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelect,
  onAddAction,
  level,
}: TreeNodeComponentProps) {
  const pathKey = node.path.join('.');
  const isExpanded = expandedPaths.has(pathKey);
  const isSelected =
    node.path.length > 0 && node.path.join('.') === selectedPath.join('.');

  // Check if this node is an ancestor of the selected path
  const isAncestor =
    node.path.length > 0 &&
    selectedPath.length > node.path.length &&
    node.path.every((segment, i) => segment === selectedPath[i]);

  const hasChildren = node.children && node.children.length > 0;
  // Entities are always expandable (to allow adding actions)
  const showToggle =
    (hasChildren && node.isExpandable) || node.type === 'entity';
  const showChildren =
    (hasChildren && isExpanded) || (node.type === 'entity' && isExpanded);

  // State for adding new action
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [actionExists, setActionExists] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when adding action
  useEffect(() => {
    if (isAddingAction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingAction]);

  // Check if action exists in children
  useEffect(() => {
    if (node.type === 'entity' && newActionName) {
      const exists =
        node.children?.some((child) => child.label === newActionName) ?? false;
      setActionExists(exists);
    }
  }, [newActionName, node]);

  // Handle add action button click
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      onToggle(node.path);
    }
    setIsAddingAction(true);
  };

  // Handle action input change
  const handleActionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewActionName(e.target.value);
  };

  // Handle action input submit
  const handleActionSubmit = () => {
    if (!newActionName.trim()) {
      setIsAddingAction(false);
      setNewActionName('');
      return;
    }

    if (actionExists) {
      // Navigate to existing action
      onSelect([node.path[0], newActionName]);
      setIsAddingAction(false);
      setNewActionName('');
      setActionExists(false);
    } else if (onAddAction) {
      // Create new action
      onAddAction(node.path[0], newActionName.trim());
      setIsAddingAction(false);
      setNewActionName('');
    }
  };

  // Handle action input key down
  const handleActionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleActionSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingAction(false);
      setNewActionName('');
      setActionExists(false);
    }
  };

  // Handle action input blur - submit on blur (when clicking away)
  const handleActionBlur = () => {
    // Small delay to allow click events to fire, then submit
    setTimeout(() => {
      handleActionSubmit();
    }, 150);
  };

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isToggleClick = target.classList.contains('elb-mapping-tree-toggle');
    const isAddButtonClick = target.classList.contains(
      'elb-mapping-tree-add-button',
    );

    if (isAddButtonClick) {
      return; // Already handled by button
    }

    if (isToggleClick && showToggle) {
      // Clicked on toggle arrow - always toggle
      onToggle(node.path);
    } else if (node.type === 'entity') {
      // Clicked on entity row - navigate to entity pane and expand if not already expanded
      onSelect(node.path);
      if (!isExpanded) {
        onToggle(node.path);
      }
    } else {
      // Clicked on rule/property - select (navigate)
      onSelect(node.path);
      // Also expand if has children and not already expanded
      if (hasChildren && node.isExpandable && !isExpanded) {
        onToggle(node.path);
      }
    }
  };

  return (
    <div
      className={`elb-mapping-tree-node elb-mapping-tree-node--level-${level}`}
    >
      <div
        className={`elb-mapping-tree-node-content ${isSelected ? 'is-selected' : ''} ${isAncestor ? 'is-ancestor' : ''} ${node.type === 'entity' ? 'is-entity' : ''}`}
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick(e as unknown as React.MouseEvent);
          }
        }}
      >
        {/* Toggle arrow */}
        {showToggle ? (
          <span
            className={`elb-mapping-tree-toggle ${isExpanded ? 'is-expanded' : ''}`}
          >
            ›
          </span>
        ) : (
          <span className="elb-mapping-tree-spacer" />
        )}

        {/* Label */}
        <span
          className={`elb-mapping-tree-label elb-mapping-tree-label--${node.type}`}
        >
          {node.label}
        </span>

        {/* Add button for entities */}
        {node.type === 'entity' && onAddAction && (
          <button
            type="button"
            className="elb-mapping-tree-add-button"
            onClick={handleAddClick}
            aria-label="Add action"
            title="Add action"
          >
            +
          </button>
        )}
      </div>

      {showChildren && (
        <div className="elb-mapping-tree-children">
          {node.children?.map((child) => (
            <TreeNodeComponent
              key={child.path.join('.')}
              node={child}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddAction={onAddAction}
              level={level + 1}
            />
          ))}

          {/* Add action input field */}
          {isAddingAction && node.type === 'entity' && (
            <div className="elb-mapping-tree-add-action">
              <span className="elb-mapping-tree-spacer" />
              <input
                ref={inputRef}
                type="text"
                className={`elb-mapping-tree-add-input ${actionExists ? 'is-error' : ''}`}
                value={newActionName}
                onChange={handleActionInput}
                onKeyDown={handleActionKeyDown}
                onBlur={handleActionBlur}
                placeholder="action"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Full tree view sidebar (Pure Presentation Component)
 *
 * Displays hierarchical structure of mapping configuration.
 * This is a pure presentation component - all state management
 * should be handled by the parent component or useTreeState hook.
 *
 * Features:
 * - Hierarchical tree display
 * - Expand/collapse controls
 * - Click to navigate
 * - Visual indication of current path
 *
 * @example
 * const treeState = useTreeState([[]]);
 *
 * <MappingTreeSidebar
 *   config={mappingConfig}
 *   currentPath={['product', 'view']}
 *   expandedPaths={treeState.expandedPaths}
 *   visible={true}
 *   onToggle={treeState.togglePath}
 *   onNavigate={(path) => navigate(path)}
 * />
 */
export interface MappingTreeSidebarProps {
  config: Mapping.Config;
  currentPath: string[];
  expandedPaths: Set<string>;
  visible: boolean;
  onToggle: (path: string[]) => void;
  onNavigate: (path: string[]) => void;
  onAddAction?: (entity: string, action: string) => void;
  onAddEntity?: (entity: string) => void;
  onClose?: () => void;
  className?: string;
}

export function MappingTreeSidebar({
  config,
  currentPath,
  expandedPaths,
  visible,
  onToggle,
  onNavigate,
  onAddAction,
  onAddEntity,
  onClose,
  className = '',
}: MappingTreeSidebarProps) {
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [entityExists, setEntityExists] = useState(false);
  const entityInputRef = useRef<HTMLInputElement>(null);

  // Focus input when adding entity
  useEffect(() => {
    if (isAddingEntity && entityInputRef.current) {
      entityInputRef.current.focus();
    }
  }, [isAddingEntity]);

  // Check if entity exists
  useEffect(() => {
    if (newEntityName) {
      const exists = Object.keys(config).includes(newEntityName);
      setEntityExists(exists);
    }
  }, [newEntityName, config]);

  if (!visible) {
    return null;
  }

  const tree = buildTreeFromMapping(config);

  const handleAddEntityClick = () => {
    setIsAddingEntity(true);
  };

  const handleEntityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEntityName(e.target.value);
  };

  const handleEntitySubmit = () => {
    if (!newEntityName.trim()) {
      setIsAddingEntity(false);
      setNewEntityName('');
      return;
    }

    if (entityExists) {
      // Navigate to existing entity - expand it
      onToggle([newEntityName]);
      setIsAddingEntity(false);
      setNewEntityName('');
      setEntityExists(false);
    } else if (onAddEntity) {
      // Create new entity
      onAddEntity(newEntityName.trim());
      setIsAddingEntity(false);
      setNewEntityName('');
    }
  };

  const handleEntityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEntitySubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingEntity(false);
      setNewEntityName('');
      setEntityExists(false);
    }
  };

  const handleEntityBlur = () => {
    // Small delay to allow click events to fire, then submit
    setTimeout(() => {
      handleEntitySubmit();
    }, 150);
  };

  return (
    <aside
      className={`elb-mapping-tree-sidebar ${className}`}
      aria-label="Mapping structure"
    >
      <div className="elb-mapping-tree-content">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.path.join('.')}
            node={node}
            expandedPaths={expandedPaths}
            selectedPath={currentPath}
            onToggle={onToggle}
            onSelect={onNavigate}
            onAddAction={onAddAction}
            level={0}
          />
        ))}

        {/* Add Entity Button */}
        {!isAddingEntity && onAddEntity && (
          <button
            type="button"
            className="elb-mapping-tree-add-entity-button"
            onClick={handleAddEntityClick}
          >
            + add entity
          </button>
        )}

        {/* Add Entity Input */}
        {isAddingEntity && (
          <div className="elb-mapping-tree-add-entity">
            <input
              ref={entityInputRef}
              type="text"
              className={`elb-mapping-tree-add-entity-input ${entityExists ? 'is-error' : ''}`}
              value={newEntityName}
              onChange={handleEntityInput}
              onKeyDown={handleEntityKeyDown}
              onBlur={handleEntityBlur}
              placeholder="entity"
            />
          </div>
        )}

        {/* Bottom padding for scrolling */}
        <div className="elb-mapping-tree-bottom-padding" />
      </div>
    </aside>
  );
}
