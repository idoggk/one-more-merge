# r38: import the v22 unit tiers recovered from the stalled ChatGPT art chat (screenshots/v22raw/v22_NN.png).
# Ranks 1-6 per family; a missing top tier reuses the nearest lower one. Trim alpha, fit inside 256x256, webp.
from PIL import Image

RANKS = {
    'mortar': [7, 8, 15, 9, 10, 13],
    'fuse_box': [19, 23, 25, 21, 26, 26],
    'amplifier': [22, 24, 27, 29, 29, 29],
    'signal_beacon': [28, 30, 32, 31, 31, 31],
    'horn': [14, 17, 18, 20, 20, 20],
    'arc_welder': [35, 35, 37, 37, 40, 40],
}


def fit(n, box=256):
    im = Image.open(f'screenshots/v22raw/v22_{n:02d}.png').convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    im = im.crop(bb)
    k = box / max(im.size)
    return im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)


for fam, ids in RANKS.items():
    for r, n in enumerate(ids, 1):
        fit(n).save(f'src/assets/art/{fam}_{r}.webp', 'WEBP', quality=90, method=6)
    print(fam, ids)
