import React, { useState } from 'react';
import { Icon } from '@iconify/react';
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

interface ModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

const PropertyModal = ({ property, isOpen, onClose }: ModalProps) => {
  if (!isOpen || !property) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <code className={styles.modalPropertyName}>{property.name}</code>
            {property.required && (
              <span className={styles.requiredIcon}>*</span>
            )}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalRow}>
            <span className={styles.modalLabel}>Type:</span>
            <code className={styles.modalType}>{property.type}</code>
          </div>
          <div className={styles.modalRow}>
            <span className={styles.modalLabel}>Description:</span>
            <p className={styles.modalDescription}>{property.description}</p>
          </div>
          {property.default && (
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Default:</span>
              <code className={styles.modalDefault}>{property.default}</code>
            </div>
          )}
          {property.example && (
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Example:</span>
              <code className={styles.modalExample}>{property.example}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SettingsTable = ({ properties }: SettingsTableProps) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasRequiredProperties = properties.some(
    (property) => property.required,
  );

  const openModal = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.settingsTable}>
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
                <td className={styles.propertyCell}>
                  <code className={styles.propertyName}>
                    {property.name}
                    {property.required && (
                      <span className={styles.requiredIcon}>*</span>
                    )}
                  </code>
                </td>
                <td className={styles.typeCell}>
                  <code className={styles.propertyType}>{property.type}</code>
                </td>
                <td className={styles.description}>{property.description}</td>
                <td className={styles.actionCell}>
                  <button
                    className={styles.moreInfoButton}
                    onClick={() => openModal(property)}
                    aria-label={`More info about ${property.name}`}
                  >
                    <Icon icon="mdi:information-outline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasRequiredProperties && (
        <div className={styles.requiredNotice}>
          <span className={styles.requiredIcon}>*</span> Required fields
        </div>
      )}
      <PropertyModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
};

export default SettingsTable;
