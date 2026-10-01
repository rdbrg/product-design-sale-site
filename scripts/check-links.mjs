import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const links = [...new Set([...html.matchAll(/href="(https:\/\/[^\"]+)"/g)].map(match => match[1]))];
let failures = 0;
for (const url of links) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    console.log(`${response.status} ${url}`);
    if (!response.ok) failures++;
    await response.body?.cancel();
  } catch (error) {
    console.error(`${url}: ${error.message}`);
    failures++;
  }
}
if (failures) process.exitCode = 1;
