import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const output = path.join(root, '.build');
const manifest = JSON.parse(await readFile(path.join(root, 'assets-r14/runtime-manifest.json'), 'utf8'));
for (const [key, meta] of Object.entries(manifest.assets)) {
  const data = await readFile(path.join(root, meta.file));
  const hash = createHash('sha256').update(data).digest('hex');
  if (hash !== meta.sha256) throw new Error(`Runtime asset checksum mismatch: ${key}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(output, { recursive: true });
await cp(src, dist, { recursive: true });
await cp(path.join(root, 'assets-r14'), path.join(dist, 'assets-r14'), { recursive: true });
await writeFile(path.join(dist, '.nojekyll'), '');
await writeFile(path.join(dist, 'build.json'), JSON.stringify({
  revision: 14,
  commit: process.env.GITHUB_SHA || null,
  runtimeAssets: Object.keys(manifest.assets).length,
}, null, 2) + '\n');

// Also build a portable self-contained file for downloads and the existing VM tests.
let html = await readFile(path.join(src, 'index.html'), 'utf8');
let css = await readFile(path.join(src, 'styles.css'), 'utf8');
const font = await readFile(path.join(root, 'assets-r14/fonts/cartographer-serif.woff'));
css = css.replace('./assets-r14/fonts/cartographer-serif.woff', 'data:font/woff;base64,' + font.toString('base64'));
html = html.replace('<link rel="stylesheet" href="./styles.css">', () => '<style>' + css + '</style>');
for (const match of [...html.matchAll(/<script src="\.\/([^"<>]+)"><\/script>/g)]) {
  let script = await readFile(path.join(src, match[1]), 'utf8');
  if (match[1] === 'assets.js') {
    const assetsMatch = script.match(/window\.ICE_ASSETS = (\{[\s\S]*?\});/);
    const assets = JSON.parse(assetsMatch[1]);
    for (const [key, file] of Object.entries(assets)) {
      assets[key] = 'data:image/png;base64,' + (await readFile(path.join(root, file))).toString('base64');
    }
    script = script.replace(assetsMatch[0], () => 'window.ICE_ASSETS = ' + JSON.stringify(assets) + ';');
  }
  html = html.replace(match[0], () => '<script>' + script + '</script>');
}
await writeFile(path.join(output, 'ice-farm-standalone.html'), html);
console.log(`Built dist/ and .build/ice-farm-standalone.html; ${manifest.required.length} runtime assets verified.`);
