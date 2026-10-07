'use strict';

// Test support only. This evaluates no gameplay and never opens a browser.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { GlobalFonts } = require('@napi-rs/canvas');

const DEFAULT_TARGET = path.join(__dirname, '..', '.build', 'ice-farm-standalone.html');
const BASELINE = path.join(__dirname, 'fixtures', 'gameplay-baseline.html');
const RUNTIME_MANIFEST = path.join(__dirname, '..', 'assets-r14', 'runtime-manifest.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));

function registerR14Fonts(source = '') {
  const loaded = [];
  const warnings = [];
  const aliases = new Set(['Cartographer', 'Noto Serif CJK SC']);
  for (const block of source.matchAll(/@font-face\s*\{([^}]+)\}/gi)) {
    const family = block[1].match(/font-family\s*:\s*["']?([^;"']+)/i)?.[1]?.trim();
    const embedded = block[1].match(/data:(?:font\/[^;,]+|application\/(?:font-woff|x-font-ttf|vnd\.ms-fontobject|octet-stream));base64,([A-Za-z0-9+/=]+)/i);
    if (!embedded) continue;
    if (family) aliases.add(family);
    try {
      const key = GlobalFonts.register(Buffer.from(embedded[1], 'base64'), family || 'Cartographer');
      if (key) loaded.push({ kind: 'embedded', family: family || 'Cartographer' });
      else warnings.push('NAPI could not register the embedded font directly.');
    } catch (error) { warnings.push('Embedded font registration: ' + error.message); }
  }
  const candidates = [
    path.join(__dirname, '..', 'assets-r14', 'fonts', 'cartographer-serif.woff'),
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc',
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc',
  ];
  for (const family of aliases) {
    if (GlobalFonts.has(family)) continue;
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      try {
        if (GlobalFonts.registerFromPath(file, family)) {
          loaded.push({ kind: 'source', family, file });
          break;
        }
      } catch (error) { warnings.push(path.basename(file) + ': ' + error.message); }
    }
  }
  assert(GlobalFonts.has('Cartographer'), 'No usable embedded or source Noto Serif CJK font could be registered as Cartographer');
  return { loaded, warnings, scope: 'NAPI canvas font registration only; no CSS/browser layout engine' };
}

function sourceFileFor(meta) {
  const given = meta.file || meta.source || meta.path || meta.sourcePath || meta.source_file;
  assert.equal(typeof given, 'string', 'ICE_NEW_ART asset is missing its source file path');
  const candidates = path.isAbsolute(given)
    ? [given]
    : [path.resolve(__dirname, '..', given), path.resolve(__dirname, '..', 'assets-r14', given), path.resolve(process.cwd(), given)];
  const file = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  assert(file, 'Required art source file does not exist: ' + given);
  return file;
}

function assertR14EmbeddedAssets(source, globals) {
  const catalog = globals.ICE_NEW_ART;
  const assets = globals.ICE_ASSETS;
  assert(catalog && typeof catalog === 'object' && Object.keys(catalog).length, 'ICE_NEW_ART must enumerate required new assets');
  assert(assets && typeof assets === 'object', 'ICE_ASSETS is missing');
  assert(fs.existsSync(RUNTIME_MANIFEST), 'Runtime asset contract missing: ' + RUNTIME_MANIFEST);
  const manifest = JSON.parse(fs.readFileSync(RUNTIME_MANIFEST, 'utf8'));
  const required = manifest.required || manifest.requiredAssets || manifest.required_keys;
  assert(Array.isArray(required) && required.length, 'runtime-manifest.json must declare a nonempty required asset-key array');
  for (const entry of required) {
    const key = typeof entry === 'string' ? entry : entry.key || entry.id;
    assert(Object.hasOwn(catalog, key), 'Required runtime asset is absent from ICE_NEW_ART: ' + key);
  }
  for (const [key, meta] of Object.entries(catalog)) {
    assert(key.startsWith('r14-'), 'New runtime asset key needs the r14- prefix: ' + key);
    assert(meta && typeof meta === 'object', 'Invalid ICE_NEW_ART metadata: ' + key);
    assert.equal(typeof meta.role, 'string', 'Missing role for ' + key);
    assert(meta.role.trim(), 'Empty role for ' + key);
    const url = assets[key];
    assert.equal(typeof url, 'string', 'No ICE_ASSETS data URL for ' + key);
    const match = url.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/i);
    assert(match, 'Required new asset is not a self-contained base64 image: ' + key);
    const embedded = Buffer.from(match[1], 'base64');
    assert(embedded.length, 'Empty embedded asset: ' + key);
    const expected = fs.readFileSync(sourceFileFor(meta));
    assert.equal(sha256(embedded), sha256(expected), 'Embedded bytes differ from the declared new source: ' + key);
    assert.equal(typeof meta.sha256, 'string', 'Missing source SHA-256 for ' + key);
    assert.equal(sha256(expected), meta.sha256.toLowerCase(), 'Source SHA-256 no longer matches manifest: ' + key);
  }
  for (const match of source.matchAll(/<(script|link)\b[^>]*\b(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    assert(match[2].startsWith('data:') || match[2].startsWith('#'), 'External/local runtime dependency defeats standalone HTML: ' + match[2]);
  }
  assert(!/@import\b/i.test(source), 'Stylesheet import defeats standalone HTML');
  assert(/@font-face\s*\{[^}]*font-family\s*:\s*["']?Cartographer["']?[^}]*data:font\/woff;base64,/i.test(source), 'Cartographer WOFF must be embedded in @font-face');
  return { declared: Object.keys(catalog).length, required: required.length, scope: 'Byte-verified embedded new runtime images plus embedded font' };
}

function baselineGameplayConfig() {
  const source = fs.readFileSync(BASELINE, 'utf8');
  const scripts = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const configScript = scripts.find(script => /window\.ICE_CONFIG\s*=/.test(script));
  assert(configScript, 'Baseline ICE_CONFIG script missing');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(configScript, context);
  context.C = context.window.ICE_CONFIG;
  // These are the baseline engine's catalog extensions, before any user action.
  for (const statement of source.matchAll(/^Object\.assign\(C\.(?:items|recipes),[^\n]+;/gm)) {
    vm.runInContext(statement[0], context);
  }
  return plain(context.C);
}

function stripPresentation(value) {
  if (Array.isArray(value)) return value.map(stripPresentation);
  if (!value || typeof value !== 'object') return value;
  const ignored = new Set(['art', 'icon', 'name', 'desc', 'description', 'color', 'title']);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !ignored.has(key)).map(([key, entry]) => [key, stripPresentation(entry)]));
}

function assertSameGameplayConfig(actual) {
  const expected = baselineGameplayConfig();
  assert.equal(actual.version, 3, 'R14 must retain save version 3');
  assert.equal(actual.saveKey, 'ice-homestead-pixel-v3', 'R14 must retain the existing save key');
  for (const key of ['version', 'saveKey', 'grid', 'initial', 'crops', 'animals', 'fish', 'items', 'recipes', 'types', 'tasks']) {
    assert.deepStrictEqual(stripPresentation(plain(actual[key])), stripPresentation(expected[key]), 'Gameplay/config contract changed: ' + key);
  }
  return { savedVersion: actual.version, saveKey: actual.saveKey, scope: 'Save geometry, catalog identities, costs, times, yields, recipes, type kinds and task rewards; excludes art and presentation text' };
}

module.exports = { DEFAULT_TARGET, BASELINE, RUNTIME_MANIFEST, registerR14Fonts, assertR14EmbeddedAssets, assertSameGameplayConfig };
