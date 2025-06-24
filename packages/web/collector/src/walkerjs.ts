// browser version
import { elb, webCollector } from './';
import { getAttribute } from './utils';

let defaultMode, tagging;

// walker script
const elem = document.querySelector('script.walkerjs');

if (elem) {
  defaultMode = !!getAttribute(elem, 'data-default'); // default mode
  tagging = parseInt(getAttribute(elem, 'data-version') || '1'); // tagging version
}

const collector = webCollector({ default: defaultMode, tagging });

// Global object
window.walkerjs = collector;
window.elb = elb;

export default collector;
