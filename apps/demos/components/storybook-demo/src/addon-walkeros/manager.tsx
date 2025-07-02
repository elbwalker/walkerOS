import React from 'react';
import { addons, types, useGlobals } from 'storybook/manager-api';

const ADDON_ID = 'walkeros';
const TOOL_ID = `${ADDON_ID}/tool`;

// No manager component needed - walkerOS is controlled via globalTypes dropdown