import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const distImagesDir = path.join(distDir, 'images');

// Read actual folders from dist/images and generate folders.json
const folders = fs.readdirSync(distImagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

fs.writeFileSync(
  path.join(distDir, 'folders.json'),
  JSON.stringify({ folders }, null, 2)
);

console.log('Created folders.json with:', folders);
