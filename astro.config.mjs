import { defineConfig } from 'astro/config';

const address = process.env.SITE_URL?.trim();
let site;
let base = '/';
if (address) {
  const url = new URL(address);
  if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password || ['example.com', 'localhost'].includes(url.hostname)) {
    throw new Error('SITE_URL must be the real public HTTPS address without query or hash.');
  }
  site = url.origin;
  base = `${url.pathname.replace(/\/$/, '')}/`;
}

export default defineConfig({ site, base, output: 'static', trailingSlash: 'always' });
