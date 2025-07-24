import React from 'react';
import styles from './SettingsTable.module.css';

export interface Property {
  name: string;
  type: string;
  description: string;
  default?: string;
  required?: boolean;
  example?: string;
}

export interface SettingsTableProps {
  properties: Property[];
}

export const SettingsTable = ({ properties }: SettingsTableProps) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.settingsTable}>
        <thead>
          <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Description</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property: Property, index: number) => (
            <tr key={index}>
              <td>
                <code className={styles.propertyName}>{property.name}</code>
              </td>
              <td>
                <code className={styles.propertyType}>{property.type}</code>
              </td>
              <td className={styles.requiredCell}>
                {property.required ? (
                  <span className={styles.required}>✓</span>
                ) : (
                  <span className={styles.optional}>-</span>
                )}
              </td>
              <td>
                {property.default ? (
                  <code className={styles.defaultValue}>
                    {property.default}
                  </code>
                ) : (
                  <span className={styles.noDefault}>-</span>
                )}
              </td>
              <td className={styles.description}>{property.description}</td>
              <td>
                {property.example ? (
                  <code className={styles.example}>{property.example}</code>
                ) : (
                  <span className={styles.noExample}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SettingsTable;
