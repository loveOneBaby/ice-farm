'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const source = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
assert(source.includes('冰原航图 · R14'), 'Page title must reflect the current revision');
assert(!source.includes('data:image/png;base64,'), 'Hosted HTML must use independently cacheable assets');
let checks = 2;
for (const match of source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
  if (match[1].startsWith('data:')) continue;
  assert(match[1].startsWith('./'), 'Assets must work below a GitHub project subpath');
  assert(fs.statSync(path.join(dist, match[1])).isFile());
  checks++;
}
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(dist, 'assets.js'), 'utf8'), context);
for (const [key, meta] of Object.entries(context.window.ICE_NEW_ART)) {
  const url = context.window.ICE_ASSETS[key];
  assert(url.startsWith('./assets-r14/'));
  const bytes = fs.readFileSync(path.join(dist, url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), meta.sha256);
  checks++;
}
for (const url of Object.values(context.window.ICE_ASSETS)) assert(fs.statSync(path.join(dist,url)).isFile());
assert(fs.existsSync(path.join(dist,'assets-r14/fonts/LICENSE.txt')));
assert(!fs.existsSync(path.join(dist,'tests')));
assert(!fs.existsSync(path.join(dist,'.github')));
assert.equal(JSON.parse(fs.readFileSync(path.join(dist,'build.json'))).revision,14);
console.log(`PASS hosted package: ${checks} page/asset checks; subpath-safe resources, font license, minimal published directory.`);
