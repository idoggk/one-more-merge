// Screw Yard painted-mock v2: the 16 CODE-3D-RENDER assets (docs/art/mocks/screw-yard/ASSETS_PAINTED.md).
// three.js scene per asset, one light rig + one env map, silhouette ink outline, optional baked contact shadow,
// transparent PNG at 1x and 2x with the manifest ids as file names.
// Usage: node tools/render-yard-3d-v2.mjs [--out art-candidates/screw-yard-3d-v2] [--only screw_head_R,toolbox_wide_open_3d] [--variants on|off]
// Needs: npm install (three@0.170.0, puppeteer-core, sharp) and Chrome (env CHROME overrides the default path).
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', 'art-candidates/screw-yard-3d-v2');
const ONLY = arg('only', '') ? arg('only', '').split(',') : null;
const VARIANTS = arg('variants', 'on') !== 'off';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const threeSrc = readFileSync('node_modules/three/build/three.cjs', 'utf8');
const INK = { r: 0x3a, g: 0x22, b: 0x16 }; // warm dark brown, never black

const COLORS = { R: 0xe8452c, U: 0x2f6fe0, Y: 0xf2b632, G: 0x2fa84f };
const MAXPX = 3000;

// id, 1x size [w,h], kind, camera pitch/yaw (deg), shadow opacity, extra params
const SPEC = [
  ...['R', 'U', 'Y', 'G'].flatMap((k) => [
    { id: `screw_head_${k}`, w: 48, h: 48, kind: 'head', hex: COLORS[k], pitch: 52, yaw: 0, shadow: 0 },
    { id: `screw_side_${k}`, w: 40, h: 48, kind: 'side', hex: COLORS[k], pitch: 26, yaw: 0, shadow: 0 },
  ]),
  { id: 'screw_washer_collar', w: 56, h: 56, kind: 'collar', pitch: 52, yaw: 0, shadow: 0.3 },
  { id: 'screw_spin_frames', w: 48, h: 48, kind: 'spin', hex: COLORS.R, pitch: 30, yaw: 0, shadow: 0, frames: 12 },
  { id: 'hole_ring_brass', w: 48, h: 48, kind: 'holering', pitch: 52, yaw: 0, shadow: 0 },
  { id: 'plank_5hole_3d', w: 160, h: 48, kind: 'plank', pitch: 52, yaw: 0, shadow: 0.35 },
  { id: 'toolbox_wide_open_3d', w: 340, h: 108, kind: 'toolbox', hex: 0xd22a22, pitch: 50, yaw: 0, shadow: 0.35 },
  { id: 'holding_row_beam_3d', w: 358, h: 76, kind: 'beam', pitch: 50, yaw: 0, shadow: 0.35 },
  { id: 'next_box_steel', w: 72, h: 56, kind: 'nextbox', pitch: 50, yaw: 0, shadow: 0.35 },
  { id: 'turntable_disc', w: 390, h: 150, kind: 'turntable', pitch: 21, yaw: 0, shadow: 0.4 },
].filter((s) => !ONLY || ONLY.includes(s.id));

// Slotted-head variants (owner wants both head types readable); same rig, ids get _slot.
const VARIANT_SPEC = VARIANTS ? ['R', 'U', 'Y', 'G'].flatMap((k) => [
  { id: `screw_head_${k}_slot`, w: 48, h: 48, kind: 'head', slot: true, hex: COLORS[k], pitch: 52, yaw: 0, shadow: 0 },
  { id: `screw_side_${k}_slot`, w: 40, h: 48, kind: 'side', slot: true, hex: COLORS[k], pitch: 26, yaw: 0, shadow: 0 },
]).filter((s) => !ONLY || ONLY.includes(s.id)) : [];

// Runs inside the page. Returns { frames: [{obj, shadow}] } as data URLs.
function pageMain(spec, W, H) {
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();

  // ---- env map: warm sky, bright softbox top-left, dim warm floor (gives the glossy toy highlights) ----
  const envScene = new T.Scene();
  envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.ShaderMaterial({ side: T.BackSide,
    vertexShader: 'varying vec3 p; void main(){ p=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec3 p; void main(){ vec3 top=vec3(1.0,0.93,0.82); vec3 bot=vec3(0.42,0.27,0.18); gl_FragColor=vec4(mix(bot,top,smoothstep(-0.6,0.8,p.y)),1.0);}' })));
  const box = (w, h, x, y, z, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(6), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
  box(26, 18, -26, 30, 20, 0xffffff);
  box(10, 30, 36, 8, -10, 0xffd9a0);
  box(30, 6, 0, 12, 30, 0xfff4e0);
  scene.environment = new T.PMREMGenerator(renderer).fromScene(envScene, 0.03).texture;
  scene.environmentIntensity = 0.5;

  // ---- fixed rig: key top-left, warm rim from the back right ----
  scene.add(new T.HemisphereLight(0xfff1dc, 0x6b5a7a, 0.55));
  const key = new T.DirectionalLight(0xffffff, 1.9);
  key.position.set(-3.5, 10, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.015;
  scene.add(key);
  const rim = new T.DirectionalLight(0xffd9a0, 1.1);
  rim.position.set(6, 3, -5);
  scene.add(rim);
  const ground = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: spec.shadow || 0.0001, color: 0x2b1d2e }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const group = new T.Group();
  scene.add(group);

  // ---- materials ----
  const paint = (c, r = 0.3) => new T.MeshPhysicalMaterial({ color: c, metalness: 0.12, roughness: r, clearcoat: 0.9, clearcoatRoughness: 0.18 });
  const metal = (c, r = 0.28) => new T.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: r });
  const brass = () => new T.MeshStandardMaterial({ color: 0xf2b844, metalness: 0.55, roughness: 0.3 });
  const dark = (c) => new T.Color(c).multiplyScalar(0.3);
  const plain = (c, r = 0.85) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.0 });
  const shade = (hex, f) => new T.Color(hex).multiplyScalar(f);
  const wood = (base, span, opts = {}) => { // canvas oak with grain, seams; UV = shape coords (world units), covers `span`
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const col = new T.Color(base);
    const css = (f) => `rgb(${Math.min(255, col.r * 255 * f) | 0},${Math.min(255, col.g * 255 * f) | 0},${Math.min(255, col.b * 255 * f) | 0})`;
    g.fillStyle = css(1); g.fillRect(0, 0, 1024, 512);
    let seed = opts.seed ?? 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { // grain streaks along x
      const y = rnd() * 512, len = 120 + rnd() * 500, x = rnd() * 1024;
      g.strokeStyle = css(rnd() < 0.5 ? 0.86 : 1.1); g.globalAlpha = 0.22; g.lineWidth = 1 + rnd() * 2.5;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + (rnd() - 0.5) * 6, x + len * 0.66, y + (rnd() - 0.5) * 6, x + len, y + (rnd() - 0.5) * 4); g.stroke();
    }
    g.globalAlpha = 1;
    (opts.seams ?? []).forEach((s) => { // dark seam + light bevel next to it
      const v = opts.vertical ? s * 1024 : s * 512;
      g.fillStyle = css(0.42);
      if (opts.vertical) { g.fillRect(v - 3, 0, 6, 512); g.fillStyle = css(1.18); g.fillRect(v + 3, 0, 3, 512); }
      else { g.fillRect(0, v - 3, 1024, 6); g.fillStyle = css(1.18); g.fillRect(0, v + 3, 1024, 3); }
    });
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
    tex.repeat.set(1 / span[0], 1 / span[1]); tex.offset.set(0.5, 0.5);
    return new T.MeshPhysicalMaterial({ map: tex, roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  };

  // ---- helpers ----
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group) => {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const rrect = (w, h, r) => {
    const s = new T.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const rrectPath = (cx, cy, w, h, r) => { const s = rrect(w, h, r); const p = new T.Path(); s.getPoints(10).forEach((q, i) => (i ? p.lineTo(q.x + cx, q.y + cy) : p.moveTo(q.x + cx, q.y + cy))); p.closePath(); return p; };
  const circPath = (cx, cy, r) => { const p = new T.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); return p; };
  // shape lies in XY; extrusion depth goes +Z; rotate so it lies in XZ with thickness along +Y. Shape y maps to -z (so shape +y = away from camera).
  const slab = (shape, depth, bevel, y0 = 0) => {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 28 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0 + bevel, 0);
    return g;
  };
  const cross = (L, w) => { const p = new T.Path(); const pts = [[-w, L], [w, L], [w, w], [L, w], [L, -w], [w, -w], [w, -L], [-w, -L], [-w, -w], [-L, -w], [-L, w], [-w, w]]; pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  const crossShape = (L, w) => { const s = new T.Shape(); cross(L, w).getPoints().forEach((q, i) => (i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y))); return s; };
  const flat = (shape, y, mat, parent = group) => { const g = new T.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); return add(g, mat, 0, y, 0, parent); };

  // Pan-head screw. Head base at y=0. Phillips cross (12-point hole in the cap) or slot (cap split in two).
  const screwHead = (hex, slotted, parent) => {
    const hp = paint(hex, 0.26);
    const prof = [[0, 0], [0.5, 0], [0.5, 0.1], [0.485, 0.17], [0.45, 0.2], [0.4, 0.215], [0, 0.215]].map(([x, y]) => new T.Vector2(x, y));
    const body = add(new T.LatheGeometry(prof, 56), hp, 0, 0, 0, parent); body.material.side = T.DoubleSide;
    const capR = 0.405, capH = 0.075;
    if (!slotted) {
      const s = new T.Shape(); s.absarc(0, 0, capR, 0, Math.PI * 2, false); s.holes.push(cross(0.32, 0.085));
      add(slab(s, capH, 0.03, 0.215), hp, 0, 0, 0, parent);
      flat(crossShape(0.31, 0.093), 0.2165, plain(dark(hex), 0.9), parent);
    } else {
      const w = 0.075, a = Math.asin(w / capR);
      [1, -1].forEach((sgn) => {
        const s = new T.Shape();
        s.moveTo(Math.cos(a) * capR * sgn, w); // half disc above/below the slot
        if (sgn === 1) s.absarc(0, 0, capR, a, Math.PI - a, false); else s.absarc(0, 0, capR, Math.PI + a, 2 * Math.PI - a, false);
        s.closePath();
        const g = slab(s, capH, 0.028, 0.215);
        add(g, hp, 0, 0, 0, parent);
      });
      flat(rrect(0.86, 0.15, 0.02), 0.2165, plain(dark(hex), 0.9), parent);
    }
  };
  // Threaded shank below the head (y 0 down to -1.1), core + real helix thread
  class Helix extends T.Curve {
    constructor(r, pitch, turns) { super(); this.r = r; this.pitch = pitch; this.turns = turns; }
    getPoint(t) { const a = t * this.turns * Math.PI * 2; return new T.Vector3(Math.cos(a) * this.r, -t * this.turns * this.pitch, Math.sin(a) * this.r); }
  }
  const shank = (hex, parent, turns = 7.5) => {
    const core = metal(shade(hex, 0.55), 0.4);
    const coreM = add(new T.CylinderGeometry(0.2, 0.2, 0.98, 28), core, 0, -0.47, 0, parent);
    coreM.castShadow = true;
    add(new T.CylinderGeometry(0.2, 0.04, 0.22, 28), core, 0, -1.05, 0, parent);
    const th = new T.MeshStandardMaterial({ color: shade(hex, 1.05), metalness: 0.55, roughness: 0.3 });
    add(new T.TubeGeometry(new Helix(0.215, 0.125, turns), Math.round(turns * 40), 0.05, 8, false), th, 0, -0.03, 0, parent);
  };

  const builders = {
    head() { screwHead(spec.hex, spec.slot, group); },
    side() {
      const s = new T.Group(); group.add(s);
      s.rotation.x = 0.18; s.rotation.z = -0.1; s.position.y = 0.9;
      screwHead(spec.hex, spec.slot, s); shank(spec.hex, s);
    },
    spin() { // screw tilted toward lower right, rotating about its own axis
      const tilt = new T.Group(); group.add(tilt);
      tilt.rotation.z = -0.62; tilt.rotation.x = 0.35;
      const s = new T.Group(); tilt.add(s);
      screwHead(spec.hex, false, s); shank(spec.hex, s, 6.5);
      group.userData.spin = s;
      tilt.position.y = 0.9;
    },
    collar() { // flat steel washer, two value steps, dark well in the middle
      const sh = new T.Shape(); sh.absarc(0, 0, 0.6, 0, Math.PI * 2, false); sh.holes.push(circPath(0, 0, 0.33));
      add(slab(sh, 0.07, 0.035), metal(0xc9ced6, 0.3));
      const ring = new T.Shape(); ring.absarc(0, 0, 0.5, 0, Math.PI * 2, false); ring.holes.push(circPath(0, 0, 0.4));
      add(slab(ring, 0.012, 0.01, 0.09), metal(0x8a919d, 0.45)); // darker inner ridge = second value step
      add(new T.CylinderGeometry(0.34, 0.34, 0.04, 36), plain(0x2a2024, 0.9), 0, 0.0, 0);
    },
    holering() { // brass ring with a dark hole
      const sh = new T.Shape(); sh.absarc(0, 0, 0.5, 0, Math.PI * 2, false); sh.holes.push(circPath(0, 0, 0.33));
      add(slab(sh, 0.09, 0.05), brass());
      add(new T.CylinderGeometry(0.34, 0.34, 0.02, 36), plain(0x2a1c14, 0.95), 0, 0.0, 0);
    },
    plank() {
      const L = 5.2, Wd = 1.5, span = [L, Wd];
      const s = rrect(L, Wd, 0.18);
      const xs = [-1.9, -0.95, 0, 0.95, 1.9];
      xs.forEach((x) => s.holes.push(circPath(x, 0, 0.36)));
      const g = slab(s, 0.3, 0.05);
      add(g, [wood(0xeab269, span, { seed: 3 }), plain(0xb87a3c, 0.6)]);
      add(slab(rrect(L - 0.1, Wd - 0.1, 0.16), 0.06, 0.02), plain(0x3a2418, 0.9), 0, -0.0, 0); // dark floor in the holes
      xs.forEach((x) => { const r = new T.Shape(); r.absarc(x, 0, 0.46, 0, Math.PI * 2, false); r.holes.push(circPath(x, 0, 0.33)); add(slab(r, 0.04, 0.03, 0.34), brass()); });
    },
    toolbox() {
      const red = paint(spec.hex, 0.3);
      const redDark = paint(shade(spec.hex, 0.62), 0.4);
      const L = 7.2, D = 2.4;
      // hull: red tray with a divider, cream tray left, steel pair right
      const outer = rrect(L, D, 0.22);
      const inL = rrectPath(-1.35, 0, 4.4, 1.95, 0.16), inR = rrectPath(2.35, 0, 2.3, 1.95, 0.16);
      outer.holes.push(inL, inR);
      add(slab(outer, 0.75, 0.06), red);
      add(slab(rrect(L - 0.2, D - 0.2, 0.2), 0.12, 0.02), redDark); // floor
      // cream tray with 3 wells
      const cream = rrect(4.3, 1.88, 0.14);
      [-1.4, 0, 1.4].forEach((x) => cream.holes.push(rrectPath(x, 0, 1.25, 1.48, 0.2)));
      add(slab(cream, 0.5, 0.05, 0.14), plain(0xf0dfb6, 0.5), -1.35, 0, 0);
      add(slab(rrect(4.28, 1.86, 0.14), 0.05, 0.02, 0.14), plain(0xc8b185, 0.7), -1.35, 0, 0); // well floors
      // steel pair with 2 square wells
      const steel = rrect(2.25, 1.88, 0.14);
      [-0.55, 0.55].forEach((x) => steel.holes.push(rrectPath(x, -0.05, 0.9, 1.1, 0.12)));
      add(slab(steel, 0.5, 0.05, 0.14), metal(0xc3c9d2, 0.32), 2.35, 0, 0);
      add(slab(rrect(2.23, 1.86, 0.14), 0.05, 0.02, 0.14), plain(0x3a3a42, 0.8), 2.35, 0, 0);
      // lid standing at the back, leaning away
      const lidPivot = new T.Group(); lidPivot.position.set(0, 0.75, -D / 2 + 0.05); lidPivot.rotation.x = -0.3; group.add(lidPivot);
      const lid = slab(rrect(L, 1.3, 0.2), 0.14, 0.05); lid.rotateX(Math.PI / 2); lid.translate(0, 0.65, 0);
      const lidM = add(lid, red, 0, 0, 0, lidPivot); lidM.position.set(0, 0.0, 0.07 + 0.0);
      // inner lid panel
      const panel = slab(rrect(L - 0.5, 0.9, 0.12), 0.03, 0.02); panel.rotateX(Math.PI / 2); panel.translate(0, 0.62, 0);
      add(panel, redDark, 0, 0, 0.2, lidPivot);
      // brass latch (top centre of the lid) and two hinges at the bottom front
      add(new T.BoxGeometry(0.9, 0.34, 0.12), brass(), 0, 1.2, 0.3, lidPivot);
      add(new T.BoxGeometry(0.55, 0.14, 0.14), plain(0x5a3a1a, 0.5), 0, 1.2, 0.38, lidPivot);
      [-3.0, 3.0].forEach((x) => { add(new T.BoxGeometry(0.62, 0.75, 0.14), brass(), x, 0.46, D / 2 + 0.06); add(new T.CylinderGeometry(0.09, 0.09, 0.62, 16).rotateZ(Math.PI / 2), brass(), x, 0.78, D / 2 + 0.14); });
    },
    beam() {
      const L = 5.4, Dp = 1.2;
      const s = rrect(L, Dp, 0.2);
      const xs = [-2, -1, 0, 1, 2].map((v) => v * 1.0);
      xs.forEach((x) => s.holes.push(circPath(x, 0, 0.45)));
      const span = [L, Dp];
      add(slab(s, 0.5, 0.06, 0.12), [wood(0xf2b86a, span, { seed: 11 }), plain(0xc07f3e, 0.6)]);
      add(slab(rrect(L - 0.06, Dp - 0.06, 0.18), 0.12, 0.02), wood(0xb8782f, span, { seed: 5 })); // recessed well floors, darker
      // end pegs
      [-1, 1].forEach((sg) => add(new T.CylinderGeometry(0.2, 0.2, 0.4, 24).rotateZ(Math.PI / 2), wood(0xc88b4c, [0.4, 0.4], { seed: 2 }), sg * (L / 2 + 0.15), 0.38, 0));
    },
    nextbox() {
      const outer = rrect(2.0, 1.6, 0.2);
      outer.holes.push(rrectPath(0, 0, 1.4, 1.0, 0.16));
      add(slab(outer, 0.55, 0.06), metal(0xc3c9d2, 0.3));
      add(slab(rrect(1.9, 1.5, 0.18), 0.1, 0.02), plain(0x3a3a42, 0.8));
      add(slab((() => { const r = rrect(1.5, 1.1, 0.18); r.holes.push(rrectPath(0, 0, 1.38, 0.98, 0.15)); return r; })(), 0.03, 0.02, 0.62), metal(0x8a919d, 0.45));
    },
    turntable() {
      const R = 3, span = [2 * R, 2 * R];
      const s = new T.Shape(); s.absarc(0, 0, R, 0, Math.PI * 2, false);
      const g = new T.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 5, curveSegments: 96 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.1, 0);
      add(g, [wood(0xeaa95f, span, { seed: 9, seams: [1 / 3, 2 / 3] }), wood(0xc27d3a, [3, 1], { seed: 4 })]);
    },
  };
  builders[spec.kind]();

  // ---- camera: orthographic, fit the projected bounding box (all spin frames) with 7% padding ----
  const yaw = (spec.yaw * Math.PI) / 180, pitch = (spec.pitch * Math.PI) / 180, dist = 30;
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  scene.updateMatrixWorld(true);
  const centre = new T.Box3().setFromObject(group).getCenter(new T.Vector3());
  cam.position.set(centre.x + Math.sin(yaw) * Math.cos(pitch) * dist, centre.y + Math.sin(pitch) * dist, centre.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  cam.lookAt(centre);
  cam.updateMatrixWorld(true);
  const nFrames = spec.frames || 1;
  const setFrame = (i) => { if (group.userData.spin) group.userData.spin.rotation.y = (i / nFrames) * Math.PI * 2; scene.updateMatrixWorld(true); };
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const v = new T.Vector3();
  for (let i = 0; i < nFrames; i++) {
    setFrame(i);
    group.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.position) return;
      const p = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(p.count / 4000));
      for (let k = 0; k < p.count; k += step) {
        v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld).applyMatrix4(cam.matrixWorldInverse);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
    });
  }
  const pad = 0.075, aspect = W / H;
  const bw = maxX - minX, bh = maxY - minY;
  let fw = bw / (1 - 2 * pad), fh = bh / (1 - 2 * pad);
  if (fw / fh > aspect) fh = fw / aspect; else fw = fh * aspect;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  Object.assign(cam, { left: cx - fw / 2, right: cx + fw / 2, top: cy + fh / 2, bottom: cy - fh / 2 });
  cam.updateProjectionMatrix();
  key.target.position.copy(centre); scene.add(key.target);
  const kx = Math.max(bw, bh) * 0.9 + 1; Object.assign(key.shadow.camera, { left: -kx, right: kx, top: kx, bottom: -kx }); key.shadow.camera.updateProjectionMatrix();
  ground.position.y = new T.Box3().setFromObject(group).min.y - 0.001;

  const frames = [];
  for (let i = 0; i < nFrames; i++) {
    setFrame(i);
    ground.visible = false; renderer.render(scene, cam); const obj = renderer.domElement.toDataURL('image/png');
    let shadow = null;
    if (spec.shadow) {
      ground.visible = true;
      const restore = [];
      group.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { restore.push([m, m.colorWrite]); m.colorWrite = false; }); } });
      renderer.render(scene, cam); shadow = renderer.domElement.toDataURL('image/png');
      restore.forEach(([m, c]) => { m.colorWrite = c; });
    }
    frames.push({ obj, shadow });
  }
  return frames;
}

const buf64 = (u) => Buffer.from(u.split(',')[1], 'base64');

// Ink outline = dilated silhouette. width 3.5% of the 2x sprite height, composited under the object; optional shadow layer under the ink.
async function finish(frame, spec, rw, rh) {
  const objBuf = buf64(frame.obj);
  const rpx = Math.max(1.5, 0.035 * rh * 0.86); // outline radius in render pixels (3.5% of sprite height)
  const alpha = await sharp(objBuf).ensureAlpha().extractChannel(3).toBuffer();
  const mask = await sharp(alpha).blur(Math.max(0.3, rpx / 2.26)).threshold(3).extractChannel(0).raw().toBuffer();
  const inkLayer = await sharp({ create: { width: rw, height: rh, channels: 3, background: INK } })
    .joinChannel(mask, { raw: { width: rw, height: rh, channels: 1 } }).png().toBuffer();
  const layers = [];
  if (frame.shadow) layers.push({ input: buf64(frame.shadow) });
  layers.push({ input: inkLayer }, { input: objBuf });
  return sharp({ create: { width: rw, height: rh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
}

mkdirSync(join(OUT, '1x'), { recursive: true });
mkdirSync(join(OUT, '2x'), { recursive: true });
mkdirSync(join(OUT, 'variants', '1x'), { recursive: true });
mkdirSync(join(OUT, 'variants', '2x'), { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setContent('<canvas></canvas>');
await page.addScriptTag({ content: `var module={exports:{}};var exports=module.exports;${threeSrc};window.THREE=module.exports;` });
await page.evaluate(`window.pageMain = ${pageMain.toString()}`);
const log = [];
for (const s of [...SPEC, ...VARIANT_SPEC]) {
  const sc = Math.min(Math.ceil(1024 / Math.max(s.w * 2, s.h * 2)) * 2, Math.floor(MAXPX / Math.max(s.w * 2, s.h * 2)));
  const rw = s.w * 2 * sc, rh = s.h * 2 * sc;
  const frames = await page.evaluate((sp, w, h) => window.pageMain(sp, w, h), s, rw, rh);
  const done = [];
  for (const f of frames) done.push(await finish(f, s, rw, rh));
  const isVar = s.id.endsWith('_slot');
  const dir = isVar ? join(OUT, 'variants') : OUT;
  const outs = [];
  for (const [label, mult] of [['2x', 2], ['1x', 1]]) {
    const cellW = s.w * mult, cellH = s.h * mult;
    const cells = await Promise.all(done.map((d) => sharp(d).resize(cellW, cellH, { kernel: 'lanczos3' }).png().toBuffer()));
    let img;
    if (cells.length === 1) img = cells[0];
    else img = await sharp({ create: { width: cellW * cells.length, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(cells.map((c, i) => ({ input: c, left: i * cellW, top: 0 }))).png().toBuffer();
    writeFileSync(join(dir, label, `${s.id}.png`), img);
    outs.push(`${label} ${cellW * cells.length}x${cellH}`);
  }
  log.push(`${s.id}: ${outs.join(', ')}  (render ${rw}x${rh})`);
  console.log(log[log.length - 1]);
}
await browser.close();
