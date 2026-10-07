# r38: import one ChatGPT PNG into src/assets/art/<key>.webp - trims transparent margins, keeps alpha, resizes to a
# target width. Usage: python tools/import-art.py <src.png> <key> <width> [--no-trim]
import sys
from PIL import Image

src, key, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGBA')
if '--no-trim' not in sys.argv:
    bb = im.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if bb:
        im = im.crop(bb)
h = round(im.size[1] * width / im.size[0])
im = im.resize((width, h), Image.LANCZOS)
out = f'src/assets/art/{key}.webp'
im.save(out, 'WEBP', quality=90, method=6)
print(out, im.size)
