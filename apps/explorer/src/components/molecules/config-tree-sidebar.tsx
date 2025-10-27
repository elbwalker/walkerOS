import { useState, useRef, useEffect } from 'react';
import type { ConfigTreeNode } from '../../utils/config-tree-builder';
import { MappingInputWithButton } from '../atoms/mapping-input-with-button';
import type { NodeType } from '../../hooks/useMappingNavigation';

/**
 * Tree node component for config structure (recursive)
 */
interface ConfigTreeNodeComponentProps {
  node: ConfigTreeNode;
  expandedPaths: Set<string>;
  selectedPath: string[];
  onToggle: (path: string[]) => void;
  onSelect: (path: string[]) => void;
  onAddAction?: (entity: string, action: string) => void;
  level: number;
}

function ConfigTreeNodeComponent({
  node,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelect,
  onAddAction,
  level,
}: ConfigTreeNodeComponentProps) {
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
  const showToggle =
    (hasChildren && node.isExpandable) ||
    node.type === 'entity' ||
    (node.key === 'mapping' && node.path.length === 1);
  const showChildren = hasChildren && isExpanded;

  // State for adding new action (only for entities under mapping)
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [actionExists, setActionExists] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if this is an entity node (path like ['mapping', 'product'])
  const isEntityNode =
    node.type === 'entity' &&
    node.path.length === 2 &&
    node.path[0] === 'mapping';

  // Focus input when adding action
  useEffect(() => {
    if (isAddingAction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingAction]);

  // Check if action exists in children
  useEffect(() => {
    if (isEntityNode && newActionName) {
      const exists =
        node.children?.some((child) => child.label === newActionName) ?? false;
      setActionExists(exists);
    }
  }, [newActionName, node, isEntityNode]);

  // Handle add action button click
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      onToggle(node.path);
    }
    setIsAddingAction(true);
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
      const existingChild = node.children?.find(
        (child) => child.label === newActionName,
      );
      if (existingChild) {
        onSelect(existingChild.path);
      }
      setIsAddingAction(false);
      setNewActionName('');
      setActionExists(false);
    } else if (onAddAction && isEntityNode) {
      // Create new action
      onAddAction(node.path[1], newActionName.trim());
      setIsAddingAction(false);
      setNewActionName('');
    }
  };

  // Handle action input key down
  const handleActionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingAction(false);
      setNewActionName('');
      setActionExists(false);
    }
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
    } else {
      // Clicked on row - select and navigate
      onSelect(node.path);
      // Also expand if has children and not already expanded
      if (hasChildren && !isExpanded) {
        onToggle(node.path);
      }
    }
  };

  const displayLabel = node.label;

  return (
    <div
      className={`elb-mapping-tree-node elb-mapping-tree-node--level-${level}`}
    >
      <div
        className={`elb-mapping-tree-node-content ${isSelected ? 'is-selected' : ''} ${isAncestor ? 'is-ancestor' : ''} ${isEntityNode ? 'is-entity' : ''} ${!node.hasValue ? 'is-empty' : ''}`}
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
          {displayLabel}
        </span>

        {/* Add button for entities under mapping */}
        {isEntityNode && onAddAction && (
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
            <ConfigTreeNodeComponent
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
          {isAddingAction && isEntityNode && (
            <div className="elb-mapping-tree-add-action">
              <span className="elb-mapping-tree-spacer" />
              <div
                ref={inputRef as any}
                className="elb-mapping-tree-add-input-wrapper"
              >
                <MappingInputWithButton
                  value={newActionName}
                  onChange={(val) => setNewActionName(val)}
                  onSubmit={handleActionSubmit}
                  onKeyDown={handleActionKeyDown}
                  buttonLabel={actionExists ? 'Open' : 'Create'}
                  showButton={true}
                  placeholder="action"
                  className={`elb-mapping-tree-add-input ${actionExists ? 'is-existing' : ''}`}
                  autoFocus={true}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Config Tree Sidebar - Shows full destination config structure
 *
 * Displays hierarchical structure of destination configuration:
 * - Settings
 * - Mapping (entities → actions)
 * - Data
 * - Policy
 * - Consent
 * - Options
 *
 * This is a pure presentation component - all state management
 * should be handled by the parent component.
 *
 * Features:
 * - Hierarchical tree display
 * - Expand/collapse controls
 * - Click to navigate with proper NodeType
 * - Visual indication of current path
 * - Add action buttons for entities
 *
 * @example
 * <ConfigTreeSidebar
 *   tree={buildConfigTree(config, schemas, sections)}
 *   currentPath={['settings']}
 *   expandedPaths={expandedPathsSet}
 *   visible={true}
 *   onToggle={(path) => togglePath(path)}
 *   onNavigate={(path) => navigate(path)}
 * />
 */
export interface ConfigTreeSidebarProps {
  tree: ConfigTreeNode[];
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

export function ConfigTreeSidebar({
  tree,
  currentPath,
  expandedPaths,
  visible,
  onToggle,
  onNavigate,
  onAddAction,
  onAddEntity,
  onClose,
  className = '',
}: ConfigTreeSidebarProps) {
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

  // Check if entity exists in mapping section
  useEffect(() => {
    if (newEntityName) {
      const mappingNode = tree.find((node) => node.key === 'mapping');
      const exists =
        mappingNode?.children?.some((child) => child.label === newEntityName) ??
        false;
      setEntityExists(exists);
    }
  }, [newEntityName, tree]);

  if (!visible) {
    return null;
  }

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
      // Navigate to existing entity - find and navigate to it
      const mappingNode = tree.find((node) => node.key === 'mapping');
      const existingEntity = mappingNode?.children?.find(
        (child) => child.label === newEntityName,
      );
      if (existingEntity) {
        onNavigate(existingEntity.path);
        onToggle(existingEntity.path);
      }
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
      aria-label="Config structure"
    >
      <div className="elb-mapping-tree-content">
        {tree.map((node) => (
          <ConfigTreeNodeComponent
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

        {/* Add Entity Section - sticky container */}
        <div className="elb-mapping-tree-add-entity-section">
          {!isAddingEntity && onAddEntity && (
            <button
              type="button"
              className="elb-mapping-tree-add-entity-button"
              onClick={handleAddEntityClick}
            >
              <span>+</span> Add Entity
            </button>
          )}

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
        </div>

        {/* Bottom padding for scrolling */}
        <div className="elb-mapping-tree-bottom-padding" />
      </div>

      {/* Mobile close button - absolute at bottom right */}
      {onClose && (
        <button
          type="button"
          className="elb-mapping-tree-close-button"
          onClick={onClose}
          aria-label="Close tree sidebar"
          title="Close sidebar"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </aside>
  );
}
