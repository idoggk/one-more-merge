import sharp from 'sharp';
const D = 'art-candidates/road-kit-ch6-strip-v2';
const b = await sharp(`${D}/ch6/road_ch6_straight_h.webp`).png().toBuffer();
await sharp({ create: { width: 1536, height: 512, channels: 4, background: '#202028' } })
  .composite([0, 1, 2].map(i => ({ input: b, left: i * 512, top: 0 }))).png().toFile(`${D}/tile3_ch6.png`);
