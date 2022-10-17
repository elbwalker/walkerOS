// browser version
import Elbwalker from './elbwalker';

let defaultMode, version;

// walker script
const elem = document.querySelector('script.elbwalker');

if (elem) {
  defaultMode = !!elem.getAttribute('data-default'); // default mode
  version = parseInt(elem.getAttribute('data-version') || '1'); // config version
}

const instance = Elbwalker({ default: defaultMode, version });

// Global object
window.elbwalker = instance;

export default instance;
