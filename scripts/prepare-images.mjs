import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const destination = new URL('../public/images/', import.meta.url);
await mkdir(destination, { recursive: true });

const sources = [
  ['rossko', 'https://rdbrg.github.io/product-portfolio/screens/карта процесс-опыта.png'],
  ['basis', 'https://rdbrg.github.io/product-portfolio/screens/bazis/Главная страница.png'],
  ['aromatny', 'https://rdbrg.github.io/product-portfolio/screens/aromatnymir/Каталог.png'],
];

for (const [name, source] of sources) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`${source}: ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input).metadata();
  // Preserve the complete source screenshot, with padding rather than cropping.
  const output = await sharp(input).resize(1000, 640, { fit: 'contain', background: '#eef1f5' }).webp({ quality: 85 }).toBuffer();
  await writeFile(new URL(`${name}.webp`, destination), output);
  console.log(`${name}: ${metadata.width}x${metadata.height} -> 1000x640, ${Math.round(output.length / 1024)} KB`);
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f7f8fa"/><rect x="64" y="70" width="12" height="12" fill="#294fe6"/>
<g font-family="Arial, sans-serif" fill="#22262e"><text x="94" y="86" font-size="24">ВАДИМ РОДБЕРГ</text>
<text x="64" y="240" font-size="68" font-weight="600">Продуктовый дизайн</text>
<text x="64" y="325" font-size="68" font-weight="600" fill="#294fe6">и автоматизация</text>
<text x="64" y="410" font-size="68" font-weight="600">бизнеса</text>
<path d="M64 475H1136" stroke="#dce0e7"/><text x="64" y="534" font-size="25">От разбора задачи до сопровождения запуска</text>
<path d="M1065 150h65v65m-65 0 65-65" fill="none" stroke="#294fe6" stroke-width="6"/>
</g></svg>`;
await sharp(Buffer.from(og)).png().toFile(new URL('og.png', destination).pathname.replace(/^\/(\w:)/, '$1'));
console.log('Open Graph image: 1200x630');
