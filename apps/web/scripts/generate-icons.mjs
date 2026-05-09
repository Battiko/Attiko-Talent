import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const iconsDir = join(publicDir, "icons");

mkdirSync(iconsDir, { recursive: true });

// Luxury black & gold "A" icon SVG
function makeSvg(size) {
  const pad = size * 0.08;
  const inner = size - pad * 2;
  const fontSize = size * 0.52;
  const borderW = Math.max(1, size * 0.018);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E8C76A;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#C9A84C;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A07830;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E8C76A;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#8A6020;stop-opacity:0.6" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0A0A0A"/>

  <!-- Outer border -->
  <rect x="${borderW}" y="${borderW}" width="${size - borderW * 2}" height="${size - borderW * 2}"
    fill="none" stroke="url(#borderGrad)" stroke-width="${borderW}"/>

  <!-- Inner border (double-rule luxury frame) -->
  <rect x="${borderW * 3.5}" y="${borderW * 3.5}"
    width="${size - borderW * 7}" height="${size - borderW * 7}"
    fill="none" stroke="url(#borderGrad)" stroke-width="${borderW * 0.5}" opacity="0.5"/>

  <!-- The A lettermark -->
  <text
    x="${size / 2}"
    y="${size * 0.685}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${fontSize}"
    font-weight="300"
    fill="url(#goldGrad)"
    text-anchor="middle"
    letter-spacing="${size * 0.01}"
  >A</text>

  <!-- Thin decorative line under A -->
  <line
    x1="${size * 0.35}" y1="${size * 0.78}"
    x2="${size * 0.65}" y2="${size * 0.78}"
    stroke="url(#borderGrad)" stroke-width="${borderW * 0.6}" opacity="0.7"/>

  <!-- Corner marks -->
  ${cornerMarks(size, borderW * 2.5, size * 0.055)}
</svg>`;
}

function cornerMarks(size, inset, len) {
  const w = Math.max(0.8, size * 0.012);
  const color = "#C9A84C";
  const op = 0.4;
  return `
  <!-- TL -->
  <line x1="${inset}" y1="${inset}" x2="${inset + len}" y2="${inset}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <line x1="${inset}" y1="${inset}" x2="${inset}" y2="${inset + len}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <!-- TR -->
  <line x1="${size - inset}" y1="${inset}" x2="${size - inset - len}" y2="${inset}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <line x1="${size - inset}" y1="${inset}" x2="${size - inset}" y2="${inset + len}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <!-- BL -->
  <line x1="${inset}" y1="${size - inset}" x2="${inset + len}" y2="${size - inset}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <line x1="${inset}" y1="${size - inset}" x2="${inset}" y2="${size - inset - len}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <!-- BR -->
  <line x1="${size - inset}" y1="${size - inset}" x2="${size - inset - len}" y2="${size - inset}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>
  <line x1="${size - inset}" y1="${size - inset}" x2="${size - inset}" y2="${size - inset - len}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`;
}

const sizes = [
  { name: "icon-72.png",   size: 72 },
  { name: "icon-96.png",   size: 96 },
  { name: "icon-128.png",  size: 128 },
  { name: "icon-144.png",  size: 144 },
  { name: "icon-152.png",  size: 152 },
  { name: "icon-192.png",  size: 192 },
  { name: "icon-384.png",  size: 384 },
  { name: "icon-512.png",  size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-16.png", size: 16 },
];

for (const { name, size } of sizes) {
  const svg = Buffer.from(makeSvg(size));
  await sharp(svg).png().toFile(join(iconsDir, name));
  console.log(`✓ ${name}`);
}

// Also write the SVG itself
import { writeFileSync } from "fs";
writeFileSync(join(iconsDir, "icon.svg"), makeSvg(512));
console.log("✓ icon.svg");

console.log("\nAll icons generated.");
