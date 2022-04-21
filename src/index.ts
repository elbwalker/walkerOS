import elbwalker from './elbwalker';

// walker script
const elem = document.querySelector('script.elbwalker');
const projectId = (elem && elem.getAttribute('data-project')) || ''; // managed mode
const custom = (elem && !!elem.getAttribute('data-custom')) || false; // custom mode

elbwalker.go({ projectId, custom });

// Global object
window.elbwalker = elbwalker;
