import { addons, types } from 'storybook/manager-api';

const ADDON_ID = 'walkeros';
const PANEL_ID = `${ADDON_ID}/panel`;

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.TAB,
    title: 'walkerOS',
    render: () => null,
  });
});