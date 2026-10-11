# Polish-pass test (two ranks, no attachments needed)

Purpose: find out whether a second GPT pass can lift a sheet cell from about 7 to 8 **without changing the design**. We test on ranks 4 and 7 of the Piston v3 sheet. Send in the same ChatGPT chat as v3, save the result as `inbox/piston_polish_v1.png`.

```
Test: take the machine in rank 4 and the machine in rank 7 from the last sheet and redraw each one as a final, polished game icon.

Rules for BOTH: keep it exactly the same machine: same parts in the same places, same camera angle, same silhouette, same colours, same cream plate and feet. Do NOT add, remove or move any part.

What to improve:
- bolder dark outline, about 5 percent of the machine's width, a darker shade of each colour (not black)
- smoother, simpler shading: one big soft highlight per part on the upper left, one thin specular streak, soft core shadow on the lower right; remove scratches, tiny marks, engraved lines and noisy texture
- crisp clean edges, slightly rounder corners, the finish of the best polished art in top mobile games

Output: one image, landscape, 2 cells side by side (rank 4 on the left, rank 7 on the right), pure flat white #ffffff background, big margin, no shadow under the plate, no text, no glow.
```

How I will judge it: slice it (`--cols 2 --rows 1`), then compare each polished machine with its original: silhouette overlap at least 0.90 means the design was kept; below 0.85 means GPT redesigned it. Then the normal rubric.
