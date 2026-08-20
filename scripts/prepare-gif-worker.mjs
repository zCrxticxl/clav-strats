import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules/gif.js/dist/gif.worker.js');
const target = resolve('public/gif.worker.js');

if (!existsSync(source)) {
  throw new Error(`gif.js worker not found at ${source}. Run npm install first.`);
}
copyFileSync(source, target);
