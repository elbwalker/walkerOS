// You can use presets to augment the Storybook configuration
// You rarely want to do this in addons,
// so often you want to delete this file and remove the reference to it in package.json#exports and package.json#bunder.nodeEntries
// Read more about presets at https://storybook.js.org/docs/addons/writing-presets

export const viteFinal = async (config: any) => {
  console.log("This addon is augmenting the Vite config");
  return config;
};

export const webpack = async (config: any) => {
  console.log("This addon is augmenting the Webpack config");
  return config;
};
