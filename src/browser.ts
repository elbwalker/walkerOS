// browser version
import Elbwalker from './elbwalker';

let custom, version;

// walker script
const elem = document.querySelector('script.elbwalker');

if (elem) {
  custom = !!elem.getAttribute('data-custom'); // custom mode
  version = parseInt(elem.getAttribute('data-version') || '1'); // config version
}

const instance = Elbwalker({ custom, version });

// Global object
window.elbwalker = instance;

export default instance;
