// Builds PWA icons. Uses src/assets/art/app_icon.png if present, else composes one from cannon art.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
const src = existsSync('src/assets/art/app_icon.png') ? 'src/assets/art/app_icon.png' : null;
for (const size of [192, 512, 180]) {
  const out = size === 180 ? 'public/apple-touch-icon.png' : `public/icon-${size}.png`;
  if (src) {
    await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(out);
  } else {
    const fg = await sharp('src/assets/art/cannon_3.png').resize(Math.round(size * 0.78), Math.round(size * 0.78), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#f2b521' } })
      .composite([{ input: fg, gravity: 'center' }])
      .png()
      .toFile(out);
  }
  console.log('wrote', out);
}
