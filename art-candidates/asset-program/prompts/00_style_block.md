# Shared STYLE / SIZE / COLOUR / PART BUDGET block (v4, after the Piston polish test and the Blowtorch first pass)

Paste this into every unit prompt (between the layout and the ladder). v3 adds the polish language and the size rule that the polish test showed we need (`../reviews/piston_polish_v1.md`).

```
STYLE: a premium polished mobile game icon, like the best art in top mobile games, matching my cannon, coil and bell anchors, NOT a realistic 3D render. Bold chunky toy-like shapes with slightly rounded corners. BOLD sticker-like dark outline, about 5 percent of the machine's width, a darker shade of each part's own colour (never pure black). Smooth simple glossy enamel: ONE big soft highlight per part on the upper left, one thin specular streak, soft core shadow on the lower right. NO scratches, tiny marks, engraved lines, panel screws, vents or grilles. Light from the top left. Same 3/4 camera in every cell: in front, slightly left of centre, slightly above. Cream base plate with rounded feet.

SIZE: the machine fills most of its cell. The base plate is at most 15 percent wider than the machine and must not dominate; small brass brackets on its corners at most.

COLOUR: the family colour ([HEX]) is the biggest colour at EVERY rank (at least 55 percent of the machine). Gold is only thin rings, rivets and brackets (at most 20 percent). Caps and moving rods are grey steel, not gold.

PART BUDGET: at most 12 distinct parts per machine. Each rank adds exactly ONE new thing to the previous rank and never removes or rearranges anything that was there. Every new thing must change the outline (the black silhouette) so neighbouring ranks are clearly different at 64 pixels. When a rank adds another copy of a part, splay the copies in different directions so the outline sprouts, not only grows inward. A rank whose change is only a material swap (for example crystal instead of metal) must ALSO change the outline: make the new part taller or wider than what it replaces. Every earlier part keeps exactly its size in later ranks; nothing shrinks.
```

Layout and forbidden list stay as in `01_pilot_piston.md`: 4x2 grid, landscape 3:2, pure white background, wide gaps, no text, no glow or aura, no floor shadows, no particles.
