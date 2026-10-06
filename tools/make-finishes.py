"""Pre-render Workshop chassis finishes from ChatGPT's registered paint/trim masks (art pack v11).
Each finish recolours ONLY its material (paint = red enamel, trim = brass), keeping the original shading,
then crops with the same alpha>=32 box the importer uses for hero_chassis and saves hero_chassis_<id>.webp.
Usage: python tools/make-finishes.py
"""
import colorsys
import numpy as np
from PIL import Image

SRC = 'art_inbox/v11/assets'
OUT = 'src/assets/art'
base = Image.open(f'{SRC}/hero_machine_chassis.png').convert('RGBA')
paint = np.asarray(Image.open(f'{SRC}/hero_chassis_paint_mask.png').convert('RGBA'))[..., 3] / 255.0
trim = np.asarray(Image.open(f'{SRC}/hero_chassis_trim_mask.png').convert('RGBA'))[..., 3] / 255.0

# finish id -> (material, target hue 0-1, saturation scale, value scale)
FINISHES = {
    'brass_kit': ('trim', 0.12, 0.85, 1.12),
    'copper_kit': ('trim', 0.055, 1.05, 0.95),
    'master_finish': ('trim', 0.135, 1.25, 1.22),
    'cherry_paint': ('paint', 0.985, 1.1, 0.88),
    'mint_paint': ('paint', 0.42, 0.75, 1.08),
    'cobalt_paint': ('paint', 0.6, 0.95, 0.95),
    'night_paint': ('paint', 0.8, 0.55, 0.62),
}

rgba = np.asarray(base).astype(np.float32) / 255.0
rgb = rgba[..., :3]
# vectorised RGB->HSV
mx = rgb.max(-1)
mn = rgb.min(-1)
v = mx
s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out


bbox = base.getchannel('A').point(lambda a: 255 if a >= 32 else 0).getbbox()
for fid, (mat, hue, ss, vs) in FINISHES.items():
    mask = (paint if mat == 'paint' else trim)[..., None]
    nh = np.full(v.shape, hue, np.float32)
    recol = hsv_to_rgb(nh, np.clip(s * ss, 0, 1), np.clip(v * vs, 0, 1))
    out = rgb * (1 - mask) + recol * mask
    img = Image.fromarray((np.dstack([out, rgba[..., 3:]]) * 255).clip(0, 255).astype(np.uint8), 'RGBA').crop(bbox)
    img.thumbnail((900, 900))
    img.save(f'{OUT}/hero_chassis_{fid}.webp', 'WEBP', quality=86)
    print('saved', fid, img.size)
