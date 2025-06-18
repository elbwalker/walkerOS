// browser version
import { elb, Walkerjs } from './';
import { getAttribute } from '@elbwalker/utils/web';

let defaultMode, tagging;

// walker script
const elem = document.querySelector('script.walkerjs');

if (elem) {
  defaultMode = !!getAttribute(elem, 'data-default'); // default mode
  tagging = parseInt(getAttribute(elem, 'data-version') || '1'); // tagging version
}

const instance = Walkerjs({ default: defaultMode, tagging });

// Global object
window.walkerjs = instance;
window.elb = elb;

export default instance;
