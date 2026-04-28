import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'src', 'renderer', 'icons');

const targets = [
    { src: 'source.svg',          out: 'icon-192.png',          size: 192 },
    { src: 'source.svg',          out: 'icon-512.png',          size: 512 },
    { src: 'source.svg',          out: 'apple-touch-icon.png',  size: 180 },
    { src: 'source-maskable.svg', out: 'icon-maskable-512.png', size: 512 }
];

for (const { src, out, size } of targets) {
    const svg = await readFile(path.join(iconsDir, src));
    await sharp(svg, { density: 384 })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toFile(path.join(iconsDir, out));
    console.log(`wrote ${out} (${size}x${size})`);
}
