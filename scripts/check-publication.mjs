import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// This existing source URL is a test fixture, NOT the new landing's address.
// The verification build is separate and must never be deployed.
const fixture = 'https://rdbrg.github.io/product-portfolio/';
const root = new URL('../', import.meta.url);
const result = spawnSync(process.execPath, [fileURLToPath(new URL('node_modules/astro/bin/astro.mjs', root)), 'build', '--outDir', '.verification-build'], {
  cwd: fileURLToPath(root),
  env: { ...process.env, SITE_URL: fixture },
  stdio: 'inherit',
});
assert.equal(result.status, 0, 'Publication verification build must succeed');
const html = await readFile(new URL('.verification-build/index.html', root), 'utf8');
const sitemap = await readFile(new URL('.verification-build/sitemap.xml', root), 'utf8');
const robots = await readFile(new URL('.verification-build/robots.txt', root), 'utf8');
assert.ok(html.includes(`rel="canonical" href="${fixture}"`));
assert.ok(html.includes(`property="og:url" content="${fixture}"`));
assert.ok(html.includes(`property="og:image" content="${fixture}images/og.png"`));
assert.ok(html.includes('href="/product-portfolio/favicon.svg"'));
assert.ok(html.includes('src="/product-portfolio/images/rossko.webp"'));
assert.ok(sitemap.includes(`<loc>${fixture}</loc>`));
assert.ok(robots.includes(`Sitemap: ${fixture}sitemap.xml`));
console.log('Canonical, Open Graph, sitemap, robots and subpath assets: PASS. dist/ was not changed.');
