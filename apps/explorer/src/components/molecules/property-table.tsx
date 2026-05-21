import React, { useState } from 'react';
import type { RJSFSchema } from '@rjsf/utils';

export interface PropertyTableProps {
  schema: RJSFSchema;
  className?: string;
  /** Message to display when the schema has no properties. Default: 'No specific properties available.' */
  emptyMessage?: string;
}

// Mapping of type titles (from $ref targets' `title` meta) to doc links.
// If a title isn't listed here, it's still rendered — just without a link.
const TYPE_LINKS: Record<string, string> = {
  'Mapping.Value': '/docs/mapping/value',
  'Mapping.Rule': '/docs/mapping/rule',
  'WalkerOS.Consent': '/docs/guides/consent',
};

interface TypeRef {
  title: string;
  href?: string;
}

interface Property {
  name: string; // dotted path for nested properties (e.g. "ga4.measurementId")
  type: string;
  typeRefs?: TypeRef[]; // if set, renderer shows links instead of plain type
  description: string;
  default?: string;
  required?: boolean;
  example?: string;
  depth: number; // nesting level; 0 for top-level, used for indentation
}

type SchemaNode = Record<string, unknown>;

function resolveRef(ref: string, root: SchemaNode): SchemaNode | undefined {
  // Only handle local refs like #/definitions/Foo or #/$defs/Foo
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
  let cur: unknown = root;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as SchemaNode)) {
      cur = (cur as SchemaNode)[p];
    } else {
      return undefined;
    }
  }
  return cur as SchemaNode | undefined;
}

function refTitle(refNode: SchemaNode | undefined, fallback: string): string {
  if (refNode && typeof refNode.title === 'string') return refNode.title;
  return fallback;
}

function titleFromRefString(ref: string): string {
  const idx = ref.lastIndexOf('/');
  return idx >= 0 ? ref.slice(idx + 1) : ref;
}

// Detect $ref presence inside a property and build a display label + refs.
// Returns undefined if no $ref involvement.
function detectTypeRefs(
  prop: SchemaNode,
  root: SchemaNode,
): { type: string; typeRefs: TypeRef[] } | undefined {
  const getRefInfo = (refStr: string): TypeRef => {
    const target = resolveRef(refStr, root);
    const title = refTitle(target, titleFromRefString(refStr));
    return { title, href: TYPE_LINKS[title] };
  };

  // Direct $ref
  if (typeof prop.$ref === 'string') {
    const info = getRefInfo(prop.$ref);
    return { type: info.title, typeRefs: [info] };
  }

  // allOf: [ { $ref } ] — treat as a simple single ref
  if (Array.isArray(prop.allOf)) {
    const allOf = prop.allOf as SchemaNode[];
    const refs = allOf
      .map((n) => (typeof n.$ref === 'string' ? (n.$ref as string) : undefined))
      .filter((r): r is string => !!r);
    if (refs.length === 1 && allOf.length === 1) {
      const info = getRefInfo(refs[0]);
      return { type: info.title, typeRefs: [info] };
    }
  }

  // anyOf: [ { $ref: X }, { type: 'array', items: { $ref: X } } ]
  if (Array.isArray(prop.anyOf)) {
    const anyOf = prop.anyOf as SchemaNode[];
    const refs: string[] = [];
    let arrayRef: string | undefined;
    let directRef: string | undefined;
    for (const branch of anyOf) {
      if (typeof branch.$ref === 'string') {
        directRef = branch.$ref as string;
        refs.push(directRef);
      } else if (
        branch.type === 'array' &&
        branch.items &&
        typeof (branch.items as SchemaNode).$ref === 'string'
      ) {
        arrayRef = (branch.items as SchemaNode).$ref as string;
        refs.push(arrayRef);
      }
    }
    if (anyOf.length === 2 && directRef && arrayRef && directRef === arrayRef) {
      const info = getRefInfo(directRef);
      return {
        type: `${info.title} | ${info.title}[]`,
        typeRefs: [info],
      };
    }
    if (refs.length > 0 && refs.length === anyOf.length) {
      const infos = refs.map(getRefInfo);
      return {
        type: infos.map((i) => i.title).join(' | '),
        typeRefs: infos,
      };
    }
  }

  // array with $ref items
  if (
    prop.type === 'array' &&
    prop.items &&
    typeof (prop.items as SchemaNode).$ref === 'string'
  ) {
    const info = getRefInfo((prop.items as SchemaNode).$ref as string);
    return { type: `${info.title}[]`, typeRefs: [info] };
  }

  // object with additionalProperties: { $ref }
  if (
    prop.type === 'object' &&
    prop.additionalProperties &&
    typeof (prop.additionalProperties as SchemaNode).$ref === 'string'
  ) {
    const info = getRefInfo(
      (prop.additionalProperties as SchemaNode).$ref as string,
    );
    return {
      type: `Record<string, ${info.title}>`,
      typeRefs: [info],
    };
  }

  return undefined;
}

interface PropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export function schemaToProperties(schema: RJSFSchema): Property[] {
  const root = schema as SchemaNode;

  // Resolve top-level indirection: allOf: [ { $ref: ... } ] should be
  // unwrapped so we render the underlying object's properties.
  let target: SchemaNode = schema as SchemaNode;
  if (
    Array.isArray(target.allOf) &&
    (target.allOf as SchemaNode[]).length === 1 &&
    typeof (target.allOf as SchemaNode[])[0].$ref === 'string'
  ) {
    const ref = (target.allOf as SchemaNode[])[0].$ref as string;
    const resolved = resolveRef(ref, root);
    if (resolved) target = resolved;
  }

  const properties: Property[] = [];
  collectProperties(target, root, 0, '', properties);
  return properties;
}

// Walk a schema object's `properties`, appending one Property per field.
// Inline nested objects (a `type: object` with its own `properties`, and no
// $ref) are expanded recursively: the parent row is emitted, then each child
// follows immediately with an incremented depth and a dotted path name.
function collectProperties(
  target: SchemaNode,
  root: SchemaNode,
  depth: number,
  prefix: string,
  out: Property[],
): void {
  const required = (target.required as string[]) || [];

  if (!target.properties) return;

  for (const [name, prop] of Object.entries(
    target.properties as Record<string, unknown>,
  )) {
    const property = prop as SchemaNode;
    const path = prefix ? `${prefix}.${name}` : name;

    // $ref-aware type detection first
    const refInfo = detectTypeRefs(property, root);

    let type: string;
    let typeRefs: TypeRef[] | undefined;

    if (refInfo) {
      type = refInfo.type;
      typeRefs = refInfo.typeRefs;
    } else {
      type = (property.type as string) || 'any';

      if (property.enum) {
        type = (property.enum as unknown[])
          .map((v: unknown) => `'${v}'`)
          .join(' | ');
      }

      if (type === 'array' && property.items) {
        const items = property.items as Record<string, unknown>;
        if (items.enum) {
          type = `Array<${(items.enum as unknown[]).map((v: unknown) => `'${v}'`).join(' | ')}>`;
        } else {
          type = `Array<${(items.type as string) || 'any'}>`;
        }
      }

      if (type === 'object' && property.additionalProperties) {
        const addProps = property.additionalProperties as Record<
          string,
          unknown
        >;
        const valueType = (addProps.type as string) || 'any';
        type = `Record<string, ${valueType}>`;
      }

      if (property.anyOf || property.oneOf) {
        const variants = (property.anyOf || property.oneOf) as Array<
          Record<string, unknown>
        >;
        type = variants.map((v) => (v.type as string) || 'any').join(' | ');
      }
    }

    let description = (property.description as string) || '';
    let example: string | undefined;

    const exampleMatch = description.match(/\(like\s+(.+?)\)$/);
    if (exampleMatch) {
      example = exampleMatch[1];
      description = description.replace(/\s*\(like\s+.+?\)$/, '');
    }

    if (type === 'any' && description.toLowerCase().includes('function')) {
      type = 'function';
    }

    // Inline nested objects carry a `title` (from .meta or derived from the
    // key during schema generation). Show it instead of a bare "object".
    const isInlineObject =
      !refInfo &&
      property.type === 'object' &&
      property.properties &&
      typeof property.properties === 'object';
    if (isInlineObject && typeof property.title === 'string') {
      type = property.title;
    }

    out.push({
      name: path,
      type,
      typeRefs,
      description,
      required: required.includes(name),
      default:
        property.default !== undefined ? String(property.default) : undefined,
      example,
      depth,
    });

    // Expand inline nested objects so readers see the full shape.
    if (isInlineObject) {
      collectProperties(property, root, depth + 1, path, out);
    }
  }
}

// Filter properties for display given a set of collapsed parent paths. A row is
// hidden when any of its ancestors (by dotted path) is collapsed.
export function getVisibleProperties(
  properties: Property[],
  collapsed: Set<string>,
): Property[] {
  if (collapsed.size === 0) return properties;
  return properties.filter((property) => {
    const parts = property.name.split('.');
    for (let i = 1; i < parts.length; i++) {
      if (collapsed.has(parts.slice(0, i).join('.'))) return false;
    }
    return true;
  });
}

function PropertyModal({ property, isOpen, onClose }: PropertyModalProps) {
  if (!isOpen || !property) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="elb-property-table__modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="elb-property-table__modal-content">
        <div className="elb-property-table__modal-header">
          <h3 className="elb-property-table__modal-title">
            <code className="elb-property-table__modal-property-name">
              {property.name}
            </code>
            {property.required && (
              <span className="elb-property-table__required-icon">*</span>
            )}
          </h3>
          <button
            className="elb-property-table__close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="elb-property-table__modal-body">
          <div className="elb-property-table__modal-row">
            <span className="elb-property-table__modal-label">Type:</span>
            <code className="elb-property-table__modal-type elb-property-table__modal-type--wrap">
              {property.type}
            </code>
          </div>
          {property.description && (
            <div className="elb-property-table__modal-row">
              <span className="elb-property-table__modal-label">
                Description:
              </span>
              <p className="elb-property-table__modal-description">
                {property.description}
              </p>
            </div>
          )}
          {property.default && (
            <div className="elb-property-table__modal-row">
              <span className="elb-property-table__modal-label">Default:</span>
              <code className="elb-property-table__modal-default">
                {property.default}
              </code>
            </div>
          )}
          {property.example && (
            <div className="elb-property-table__modal-row">
              <span className="elb-property-table__modal-label">Example:</span>
              <code className="elb-property-table__modal-example">
                {property.example}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderTypeWithRefs(type: string, refs: TypeRef[]): React.ReactNode {
  // Split the type string by each ref title, replacing occurrences with
  // either a link or the plain title if no href is mapped.
  // Build a single alternation regex from unique titles.
  const uniqueTitles = Array.from(new Set(refs.map((r) => r.title)));
  if (uniqueTitles.length === 0) return type;

  // Sort longer first so "Mapping.Value" matches before any hypothetical
  // shorter prefix.
  uniqueTitles.sort((a, b) => b.length - a.length);
  const escaped = uniqueTitles.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const re = new RegExp(`(${escaped.join('|')})`, 'g');

  const titleToHref: Record<string, string | undefined> = {};
  for (const r of refs) titleToHref[r.title] = r.href;

  const parts = type.split(re);
  return parts.map((part, i) => {
    if (uniqueTitles.includes(part)) {
      const href = titleToHref[part];
      if (href) {
        return (
          <a key={i} href={href} className="elb-property-table__type-link">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function PropertyTable({
  schema,
  className,
  emptyMessage,
}: PropertyTableProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Paths of nested groups the user has collapsed. Empty = all expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const properties = schemaToProperties(schema);

  // A property is a collapsible group when another property nests under it.
  const groupPaths = new Set<string>();
  for (const property of properties) {
    const dot = property.name.lastIndexOf('.');
    if (dot > 0) groupPaths.add(property.name.slice(0, dot));
  }

  const visibleProperties = getVisibleProperties(properties, collapsed);

  const toggleCollapsed = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (properties.length === 0) {
    return (
      <div
        className={`elb-explorer elb-property-table__empty ${className || ''}`}
        role="note"
      >
        {emptyMessage ?? 'No specific properties available.'}
      </div>
    );
  }

  const hasRequiredProperties = properties.some(
    (property) => property.required,
  );

  const TYPE_MAX_LENGTH = 30;

  const isTruncated = (type: string) => type.length > TYPE_MAX_LENGTH;

  const truncateType = (type: string) => {
    if (type.length <= TYPE_MAX_LENGTH) return type;
    return type.slice(0, TYPE_MAX_LENGTH);
  };

  const openModal = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  return (
    <div className={`elb-explorer ${className || ''}`}>
      <div className="elb-property-table__container">
        <table className="elb-property-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Description</th>
              <th>More</th>
            </tr>
          </thead>
          <tbody>
            {visibleProperties.map((property: Property, index: number) => {
              const isGroup = groupPaths.has(property.name);
              const isCollapsed = collapsed.has(property.name);
              const leafName =
                property.depth > 0
                  ? property.name.slice(property.name.lastIndexOf('.') + 1)
                  : property.name;
              return (
                <tr
                  key={property.name || index}
                  className={
                    property.depth > 0
                      ? 'elb-property-table__row--nested'
                      : undefined
                  }
                >
                  <td
                    className="elb-property-table__property-cell"
                    data-label="Property"
                    style={
                      property.depth > 0
                        ? { paddingLeft: `${0.75 + property.depth * 1.25}rem` }
                        : undefined
                    }
                  >
                    {isGroup && (
                      <button
                        type="button"
                        className="elb-property-table__group-toggle"
                        onClick={() => toggleCollapsed(property.name)}
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${leafName}`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isCollapsed
                              ? 'rotate(-90deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                    <code className="elb-property-table__property-name">
                      {leafName}
                      {property.required && (
                        <span className="elb-property-table__required-icon">
                          *
                        </span>
                      )}
                    </code>
                  </td>
                  <td
                    className="elb-property-table__type-cell"
                    data-label="Type"
                  >
                    {property.typeRefs && property.typeRefs.length > 0 ? (
                      <code className="elb-property-table__property-type">
                        {renderTypeWithRefs(property.type, property.typeRefs)}
                      </code>
                    ) : isTruncated(property.type) ? (
                      <button
                        className="elb-property-table__type-button"
                        onClick={() => openModal(property)}
                        aria-label={`View full type for ${property.name}`}
                      >
                        <code className="elb-property-table__property-type elb-property-table__property-type--truncated">
                          {truncateType(property.type)}
                        </code>
                      </button>
                    ) : (
                      <code className="elb-property-table__property-type">
                        {property.type}
                      </code>
                    )}
                  </td>
                  <td
                    className="elb-property-table__description"
                    data-label="Description"
                  >
                    {property.description}
                  </td>
                  <td
                    className="elb-property-table__action-cell"
                    data-label="More"
                  >
                    <button
                      className="elb-property-table__more-button"
                      onClick={() => openModal(property)}
                      aria-label={`More info about ${property.name}`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasRequiredProperties && (
        <div className="elb-property-table__required-notice">
          <span className="elb-property-table__required-icon">*</span> Required
          fields
        </div>
      )}
      <PropertyModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
