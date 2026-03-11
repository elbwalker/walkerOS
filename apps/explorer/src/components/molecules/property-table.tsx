import React, { useState } from 'react';
import type { RJSFSchema } from '@rjsf/utils';

export interface PropertyTableProps {
  schema: RJSFSchema;
  className?: string;
}

interface Property {
  name: string;
  type: string;
  description: string;
  default?: string;
  required?: boolean;
  example?: string;
}

interface PropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

function schemaToProperties(schema: RJSFSchema): Property[] {
  const properties: Property[] = [];
  const required = (schema.required as string[]) || [];

  if (!schema.properties) {
    return properties;
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    const property = prop as Record<string, unknown>;

    let type = (property.type as string) || 'any';

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
      const addProps = property.additionalProperties as Record<string, unknown>;
      const valueType = (addProps.type as string) || 'any';
      type = `Record<string, ${valueType}>`;
    }

    if (property.anyOf || property.oneOf) {
      const variants = (property.anyOf || property.oneOf) as Array<
        Record<string, unknown>
      >;
      type = variants.map((v) => (v.type as string) || 'any').join(' | ');
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

    properties.push({
      name,
      type,
      description,
      required: required.includes(name),
      default:
        property.default !== undefined ? String(property.default) : undefined,
      example,
    });
  }

  return properties;
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

export function PropertyTable({ schema, className }: PropertyTableProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const properties = schemaToProperties(schema);

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
            {properties.map((property: Property, index: number) => (
              <tr key={index}>
                <td
                  className="elb-property-table__property-cell"
                  data-label="Property"
                >
                  <code className="elb-property-table__property-name">
                    {property.name}
                    {property.required && (
                      <span className="elb-property-table__required-icon">
                        *
                      </span>
                    )}
                  </code>
                </td>
                <td className="elb-property-table__type-cell" data-label="Type">
                  {isTruncated(property.type) ? (
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
            ))}
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
