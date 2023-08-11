// browser version
import ElbwalkerWeb from '../elbwalker';
import { elb, getAttribute } from '../lib/utils';

let defaultMode, version;

// walker script
const elem = document.querySelector('script.elbwalker');

if (elem) {
  defaultMode = !!getAttribute(elem, 'data-default'); // default mode
  version = parseInt(getAttribute(elem, 'data-version') || '1'); // config version
}

const instance = ElbwalkerWeb({ default: defaultMode, version });

// Global object
window.elbwalker = instance;
window.elb = elb;

export default instance;
