import React from 'react';
import { roleHref, roles } from '@site/src/components/roles/roles';
import styles from './landing.module.css';
import { click, section } from './tag';

export default function Personas() {
  return (
    <section className={styles.who} {...section('personas')}>
      <h2 className={styles.kicker}>walkerOS for ...</h2>
      <div className={styles.whos} role="group" aria-label="walkerOS for">
        {roles.map((role) => (
          <a
            key={role.slug}
            href={roleHref(role.slug)}
            {...click(`persona-${role.slug}`)}
          >
            <strong>{role.title}</strong>
            <small>{role.text}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
