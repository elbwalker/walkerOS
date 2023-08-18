// browser version
import webClient from '.';
import { getAttribute } from '@elbwalker/utils';
import { elb } from './lib/trigger';

let defaultMode, version;

// walker script
const elem = document.querySelector('script.elbwalker');

if (elem) {
  defaultMode = !!getAttribute(elem, 'data-default'); // default mode
  version = parseInt(getAttribute(elem, 'data-version') || '1'); // config version
}

const instance = webClient({ default: defaultMode, version });

// Global object
window.elbwalker = instance;
window.elb = elb;

export default instance;
