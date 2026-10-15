# CRITIQUE_74 FIX pieces: raw ChatGPT candidates (try 1)

Source list: `docs/art/CRITIQUE_74.md` on branch `orch/t-4238b6f6-critic-pass-on-road-surface-kit` (fix order items 2 and 3). Generated in the owner's ChatGPT (one chat, OMM primer, then one prompt per piece, the current b6 straight and the faulty junction attached as references). 1254x1254 PNG, flat magenta #FF00FF key. **Raw only: not keyed, not sliced to the 512 kit cell, not registered, nothing wired.** Each piece was tried once (6-minute budget exceeded by the slow generations).

| File | Piece | Fix asked | My read (not an approval, needs the critic) |
|---|---|---|---|
| `raw/ch1_t_junction_try1.png` | ch1 T | chevrons same scale/phase through the centre, no plate, same kerb bevel | Chevrons run through the junction at one scale, no plate. But the kerb is a rivetted brass pipe with a big top magenta band (road sits low), so it is not the b6 kerb style; arm width is about 30 percent, not 40. Needs reframing and kerb match. |
| `raw/ch1_cross_try1.png` | ch1 cross | same | Best of the four: one continuous surface, four outer kerb corners. Chevrons in the very centre form a small diamond (slightly busy). Kerb style differs from b6 as above. |
| `raw/ch2_t_junction_try1.png` | ch2 T | one lattice, cells equal to straight, no notches | Horizontal arm is a clean checker; the vertical arm's cells are about 0.8x smaller and out of step with the horizontal lattice, so the original fault is not fixed. Redo needed. |
| `raw/ch2_cross_try1.png` | ch2 cross | same | Vertical arm cells larger than the horizontal arm's, lattices not aligned in the centre. Not fixed. Redo needed. |

## Notes for the next try
- ChatGPT cannot hold a lattice across two arms; for ch2 the code route (`tools/kit.mjs` centre shifted by half a cell, about 25 px, per CRITIQUE_74) is likelier to succeed than another GPT try. The GPT image could instead serve as a look reference for the centre.
- For ch1 ask for "same kerb as Image 1" with a pixel-exact 512 px tile at a lower resolution, and give the road band as 40 percent centred.
- Hebrew file names came from ChatGPT; files were renamed on import.
