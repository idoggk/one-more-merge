# ROAD MAP mock

Static mock of the level road tab. Spec: `docs/art/mocks/road-map/SPEC.md`.

Open `index.html?state=normal` in Chrome (states: `normal current boss locked chapter rails`, size `&w=390&h=844`, `&grid=1`, `&names=1`).
Allow local file access if images do not load: start Chrome with `--allow-file-access-from-files`.

Re-render one PNG (PowerShell, from the repo root):

```powershell
$d = (Resolve-Path art-candidates/mockups/road-map).Path -replace '\\','/'
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 --window-size=390,844 --virtual-time-budget=4000 "--screenshot=$d/roadmap_normal_390x844.png" "file:///$d/index.html?state=normal&w=390&h=844"
```

Outputs: `roadmap_<state>_<W>x<H>.png` (2x, 390x844 / 360x780 / 430x932) and `annotated_<state>_390x844.png` (grid, safe areas, layer names).
Magenta `MISSING <name>` stickers and hatched outlines mark placeholder art.
