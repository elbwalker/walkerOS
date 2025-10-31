import React from 'react';
import SettingsTable, { Property } from './SettingsTable';

export interface SchemaSettingsTableProps {
  schema: any; // JSON Schema object
}

/**
 * Convert JSON Schema to SettingsTable Property array
 */
function schemaToProperties(schema: any): Property[] {
  const properties: Property[] = [];
  const required = schema.required || [];

  if (!schema.properties) {
    return properties;
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    const property = prop as any;

    // Extract type
    let type = property.type || 'any';

    // Handle enums
    if (property.enum) {
      type = property.enum.map((v: any) => `'${v}'`).join(' | ');
    }

    // Handle arrays
    if (type === 'array' && property.items) {
      if (property.items.enum) {
        type = `Array<${property.items.enum.map((v: any) => `'${v}'`).join(' | ')}>`;
      } else {
        type = `Array<${property.items.type || 'any'}>`;
      }
    }

    // Handle objects/records
    if (type === 'object' && property.additionalProperties) {
      const valueType = property.additionalProperties.type || 'any';
      type = `Record<string, ${valueType}>`;
    }

    // Handle anyOf/oneOf unions
    if (property.anyOf || property.oneOf) {
      const variants = property.anyOf || property.oneOf;
      type = variants.map((v: any) => v.type || 'any').join(' | ');
    }

    // Extract description and example
    let description = property.description || '';
    let example: string | undefined;

    // Parse example from description using (like ...) pattern
    const exampleMatch = description.match(/\(like\s+(.+?)\)$/);
    if (exampleMatch) {
      example = exampleMatch[1];
      description = description.replace(/\s*\(like\s+.+?\)$/, '');
    }

    // Handle function type
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

export const SchemaSettingsTable = ({ schema }: SchemaSettingsTableProps) => {
  const properties = schemaToProperties(schema);
  return <SettingsTable properties={properties} />;
};

export default SchemaSettingsTable;
