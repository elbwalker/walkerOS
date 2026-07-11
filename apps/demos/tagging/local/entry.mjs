// Local-testing entry: re-exports the symbols the tagging demo imports, resolved
// from the workspace packages (which include unreleased features like
// data-elbobserve) instead of the CDN. Bundled by build-local.mjs into
// walkeros.esm.js, which index.local.html loads. Not used by the CDN index.html.
export { startFlow } from '@walkeros/collector';
export { sourceBrowser } from '@walkeros/web-source-browser';
export { sourceSession } from '@walkeros/web-source-session';
export { destinationAPI } from '@walkeros/web-destination-api';
export { destinationGtag } from '@walkeros/web-destination-gtag';
export { storageRead, storageWrite, storageDelete } from '@walkeros/web-core';
export { getId } from '@walkeros/core';
