// browser version
import Elbwalker from './elbwalker';
import { elb } from './lib/utils';

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
window.elb = elb;

export default instance;
