#!/usr/bin/env node
// Script to update manifest.json with all folders in public/images/

import { readdirSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'public', 'images');
const manifestPath = join(imagesDir, 'manifest.json');

// Get all directories in images folder
const folders = readdirSync(imagesDir)
  .filter(name => {
    const fullPath = join(imagesDir, name);
    return statSync(fullPath).isDirectory();
  })
  .sort();

const manifest = { folders };

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('Updated manifest.json with folders:', folders);
