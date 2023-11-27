
const codeBlock1 = `
elb("walker consent", { marketing: false, statistics: true });
`;

const codeBlock2 = `
elb("walker init", document.getElementById("dynamic_content"));
`;

const codeBlock3 = `
import { debounce } from '@elbwalker/walker.js';

// debounce(fn, wait=1000)
debounce(console.log)("called");
`;

const codeBlock4 = `
import { throttle } from '@elbwalker/walker.js';

// throttle(fn, delay=1000)
throttle(console.log)("called");
`;
