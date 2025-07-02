import React from 'react';
import { addons, types } from 'storybook/manager-api';

const ADDON_ID = 'walkeros';
const PANEL_ID = `${ADDON_ID}/panel`;

export const WalkerOSPanel: React.FC = () => {
  const eventData = { event: "hello world" };
  
  return (
    <div style={{ padding: '16px' }}>
      <h3>walkerOS events</h3>
      <details style={{ 
        background: '#f8f8f8', 
        padding: '8px', 
        borderRadius: '4px',
        border: '1px solid #e0e0e0'
      }}>
        <summary style={{ 
          cursor: 'pointer', 
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          Event Object
        </summary>
        <pre style={{ 
          margin: 0,
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {JSON.stringify(eventData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'walkerOS events',
    render: WalkerOSPanel,
  });
});