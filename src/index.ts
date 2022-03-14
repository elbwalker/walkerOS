import elbwalker from './elbwalker';

// Get custom projectId
const elem = document.querySelector('script.elbwalker');
const projectId = (elem && elem.getAttribute('data-project')) || '';

elbwalker.go(projectId);
