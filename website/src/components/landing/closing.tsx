import React from 'react';
import styles from './landing.module.css';

export default function Closing() {
  return (
    <div className={`${styles.wrap} ${styles.closing}`}>
      <p className={styles['foot-lead']}>
        Own the thing your growth numbers depend on.
      </p>
    </div>
  );
}
