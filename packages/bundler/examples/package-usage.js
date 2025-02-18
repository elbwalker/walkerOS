import { bundler } from '@elbwalker/bundler';

const config = {
  name: 'My Project',
  message: 'v1.0.0'
};

// Use the bundler
const output = await bundler(config);
console.log('Generated bundle:', output);

// Or write to a file
import { writeFileSync } from 'fs';
writeFileSync('my-bundle.js', output); 