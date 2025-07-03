import { ADDON_ID } from './constants';

// Register preview entries to ensure the addon's preview configuration is loaded
export const previewAnnotations = (entry: any[] = []) => {
  return [...entry, require.resolve('./preview')];
};

export const viteFinal = async (config: any) => {
  return config;
};

export const webpack = async (config: any) => {
  return config;
};
