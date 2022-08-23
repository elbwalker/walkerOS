// browser version
import elbwalker from './elbwalker';

let projectId, custom, version;

// walker script
const elem = document.querySelector('script.elbwalker');

if (elem) {
  projectId = elem.getAttribute('data-project') || undefined; // managed mode
  custom = !!elem.getAttribute('data-custom'); // custom mode
  version = parseInt(elem.getAttribute('data-version') || '1'); // config version
}

elbwalker.go({ projectId, custom, version });

// Global object
window.elbwalker = elbwalker;

export default elbwalker;
