'use strict';

// Render the actual game's canvas, not a screenshot or browser approximation.
// The HTML HUD, DOM labels, modal sheets and CSS layout are NOT rendered here.
// Usage: node farm-work/render_r14.cjs [target.html] [output.png] [overview|initial] [width] [height]
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { boot, targetPath, fontRegistration } = require('./test_farm_r14.cjs');

async function render() {
  const width = Number(process.argv[5] || 853);
  const height = Number(process.argv[6] || 1844);
  const mode = process.argv[4] || 'overview';
  const output = path.resolve(process.argv[3] || path.join(__dirname, `render-r14-${width}x${height}-napi.png`));
  assert(Number.isInteger(width) && width > 0 && width <= 10000, 'Invalid render width');
  assert(Number.isInteger(height) && height > 0 && height <= 10000, 'Invalid render height');
  assert(['overview', 'initial'].includes(mode), 'Camera mode must be overview or initial');
  const harness = boot({ width, height });
  await harness.ready();
  harness.api.resize();
  if (mode === 'overview') harness.api.overview();
  harness.api.render(1000);
  assert.equal(harness.api.metrics.errors.length, 0, 'Renderer logged game errors');
  const canvas = harness.els.get('#scene')._canvas;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  const report = {
    source: targetPath,
    output,
    dimensions: { width: canvas.width, height: canvas.height },
    camera: mode,
    renderer: '@napi-rs/canvas executing the real game canvas renderer',
    browser: false,
    scope: 'CANVAS ONLY, NO BROWSER LAYOUT. Does not verify HTML HUD, DOM labels, CSS layout, accessibility or real browser pointer events.',
    fontRegistration,
    metrics: harness.context.window.__ICE_DEMO__.metrics(),
    savedVersion: harness.api.state.version,
  };
  const reportPath = output.replace(/\.png$/i, '') + '.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

render().catch(error => { console.error(error); process.exit(1); });
