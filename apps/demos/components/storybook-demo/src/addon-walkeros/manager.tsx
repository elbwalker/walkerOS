import React from 'react';
import { addons, types } from 'storybook/manager-api';

const ADDON_ID = 'walkeros';
const PANEL_ID = `${ADDON_ID}/panel`;

export const WalkerOSPanel: React.FC = () => {
  return (
    <div style={{ padding: '16px' }}>
      <h3>walkerOS events</h3>
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '8px', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        {JSON.stringify({ event: "hello world" }, null, 2)}
      </pre>
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