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

// luma (0-255): Y 185 > R ~161 > G ~91 > U ~68 (measured gray at 70 px: R and G were equal at 147/104 after tone mapping). Red lighter and blue darker than the first pass so they split in grayscale.
const COLORS = { R: 0xff805c, U: 0x1c45ac, Y: 0xf2b632, G: 0x1f8238 };
const MAXPX = 3000;
const NOSHADOW = arg('shadow', 'on') === 'off'; // --shadow off: no baked shadow layer on any asset (for use under the game's own shadow)

// id, 1x size [w,h], kind, camera pitch/yaw (deg), shadow opacity, extra params
const SPEC = [
  ...['R', 'U', 'Y', 'G'].flatMap((k) => [
    { id: `screw_head_${k}`, w: 48, h: 48, kind: 'head', hex: COLORS[k], pitch: 52, yaw: 0, shadow: 0 },
    { id: `screw_side_${k}`, w: 40, h: 48, kind: 'side', hex: COLORS[k], pitch: 26, yaw: 0, shadow: 0 },
  ]),
  { id: 'screw_washer_collar', w: 56, h: 56, kind: 'collar', pitch: 52, yaw: 0, shadow: 0.3 },
  { id: 'screw_spin_frames', w: 48, h: 48, kind: 'spin', hex: COLORS.R, pitch: 38, yaw: 0, shadow: 0, frames: 12 },
  ...['U', 'Y', 'G'].map((k) => ({ id: `screw_spin_frames_${k}`, w: 48, h: 48, kind: 'spin', hex: COLORS[k], pitch: 38, yaw: 0, shadow: 0, frames: 12 })),
  { id: 'hole_ring_brass', w: 48, h: 48, kind: 'holering', pitch: 52, yaw: 0, shadow: 0 },
  { id: 'plank_5hole_3d', w: 160, h: 48, kind: 'plank', pitch: 52, yaw: 0, shadow: 0.35 },
  { id: 'toolbox_wide_open_3d', w: 340, h: 108, kind: 'toolbox', hex: 0xd22a22, pitch: 50, yaw: 0, shadow: 0.35 },
  { id: 'holding_row_beam_3d', w: 358, h: 76, kind: 'beam', pitch: 60, yaw: 0, shadow: 0.35 },
  { id: 'next_box_steel', w: 72, h: 56, kind: 'nextbox', pitch: 50, yaw: 0, shadow: 0.35 },
  { id: 'turntable_disc', w: 390, h: 150, kind: 'turntable', pitch: 20, yaw: 0, shadow: 0.4 },
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
  // Circles are explicit polygons with no repeated closing point, seam pushed to the back (shape +y = away from the camera).
  // absarc(0, 2pi) put a duplicate vertex at 3 o'clock, which bevelled into a visible notch.
  const CN = 128;
  const circPts = (cx, cy, r) => Array.from({ length: CN }, (_, i) => { const a = Math.PI / 2 + (i / CN) * Math.PI * 2; return new T.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r); });
  const circPath = (cx, cy, r) => { const p = new T.Path(); circPts(cx, cy, r).forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y))); p.closePath(); return p; };
  const circShape = (cx, cy, r) => { const s = new T.Shape(); circPts(cx, cy, r).forEach((q, i) => (i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y))); s.closePath(); return s; };
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
  const screwHead = (hex, slotted, parent, withGlint = true) => {
    const hp = paint(hex, 0.26);
    const prof = [[0, 0], [0.5, 0], [0.5, 0.1], [0.485, 0.17], [0.45, 0.2], [0.4, 0.215], [0, 0.215]].map(([x, y]) => new T.Vector2(x, y));
    const lathe = new T.LatheGeometry(prof, 96); lathe.rotateY(Math.PI); // revolve seam to the back
    const body = add(lathe, hp, 0, 0, 0, parent); body.material.side = T.DoubleSide;
    const capR = 0.405, capH = 0.05;
    // one bright specular shape, top-left of the cap (toy-gloss highlight), sits in the free quadrant between the cross arms
    const glint = new T.Mesh(new T.CircleGeometry(1, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
    glint.rotation.x = -Math.PI / 2; glint.rotation.z = Math.PI / 4; glint.scale.set(0.11, 0.045, 1);
    glint.position.set(-0.22, 0.215 + capH + 0.062, -0.22); if (withGlint) parent.add(glint); // not on spin frames: a specular must not rotate with the part
    if (!slotted) {
      const s = circShape(0, 0, capR); s.holes.push(cross(0.32, 0.085));
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
  // Light steel shank tinted by the head colour (so the head/shank break reads at 70 px), finer helix thread.
  const shank = (hex, parent, turns = 8, pitch = 0.108, tube = 0.04) => {
    const steel = new T.Color(0xd5dae2).lerp(new T.Color(hex), 0.28);
    const core = metal(steel.multiplyScalar(0.62), 0.4);
    add(new T.CylinderGeometry(0.2, 0.2, 0.98, 32), core, 0, -0.47, 0, parent);
    add(new T.CylinderGeometry(0.2, 0.04, 0.22, 32), core, 0, -1.05, 0, parent);
    const th = new T.MeshStandardMaterial({ color: new T.Color(0xe6eaf0).lerp(new T.Color(hex), 0.22), metalness: 0.8, roughness: 0.25 });
    add(new T.TubeGeometry(new Helix(0.212, pitch, turns), Math.round(turns * 48), tube, 10, false), th, 0, -0.03, 0, parent);
  };

  const builders = {
    head() { screwHead(spec.hex, spec.slot, group); },
    side() {
      const s = new T.Group(); group.add(s);
      s.rotation.x = 0.18; s.rotation.z = -0.1; s.position.y = 0.9;
      const hd = new T.Group(); hd.scale.setScalar(1.3); s.add(hd); // head 1.3x vs the shank
      screwHead(spec.hex, spec.slot, hd); shank(spec.hex, s);
    },
    spin() { // screw tilted toward lower right, rotating about its own axis. Coarser thread: one full turn = one pitch of travel, so frame 12 == frame 0
      const tilt = new T.Group(); group.add(tilt);
      tilt.rotation.z = -0.5; tilt.rotation.x = 0.3;
      const s = new T.Group(); tilt.add(s);
      screwHead(spec.hex, false, s, false); shank(spec.hex, s, 4.5, 0.2, 0.062);
      // asymmetric knurl notch on the cap rim so the 4-fold cross cannot hide the rotation
      add(new T.BoxGeometry(0.11, 0.07, 0.11), paint(shade(spec.hex, 0.45), 0.4), 0.41, 0.25, 0, s);
      group.userData.spin = s;
      tilt.position.y = 0.9;
    },
    collar() { // flat steel washer, two value steps, dark well in the middle
      const sh = circShape(0, 0, 0.6); sh.holes.push(circPath(0, 0, 0.33));
      add(slab(sh, 0.07, 0.035), metal(0xc9ced6, 0.3));
      const ring = circShape(0, 0, 0.5); ring.holes.push(circPath(0, 0, 0.4));
      add(slab(ring, 0.012, 0.01, 0.09), metal(0x8a919d, 0.45)); // darker inner ridge = second value step
      add(new T.CylinderGeometry(0.34, 0.34, 0.04, 36).rotateY(Math.PI), plain(0x2a2024, 0.9), 0, 0.0, 0);
    },
    holering() { // brass ring with an inner wall and a dark floor
      const sh = circShape(0, 0, 0.5); sh.holes.push(circPath(0, 0, 0.33));
      add(slab(sh, 0.09, 0.05), brass());
      // inner wall: open cylinder (inside faces) in shaded brass, so the hole has depth instead of a flat black disc
      const wallMat = new T.MeshStandardMaterial({ color: 0x8a5a1c, metalness: 0.5, roughness: 0.45, side: T.BackSide });
      add(new T.CylinderGeometry(0.335, 0.335, 0.34, 64, 1, true).rotateY(Math.PI), wallMat, 0, -0.03, 0);
      add(new T.CylinderGeometry(0.335, 0.335, 0.02, 64).rotateY(Math.PI), plain(0x2a1c14, 0.95), 0, -0.19, 0);
    },
    plank() {
      const L = 5.6, Wd = 1.75, span = [L, Wd];
      const s = rrect(L, Wd, 0.18);
      const xs = [-2.1, -1.05, 0, 1.05, 2.1];
      xs.forEach((x) => s.holes.push(circPath(x, 0, 0.42))); // holes and brass rings ~15% larger than the first pass
      const g = slab(s, 0.3, 0.05);
      add(g, [wood(0xeab269, span, { seed: 3 }), plain(0xb87a3c, 0.6)]);
      add(slab(rrect(L - 0.1, Wd - 0.1, 0.16), 0.06, 0.02), plain(0x3a2418, 0.9), 0, -0.0, 0); // dark floor in the holes
      xs.forEach((x) => { const r = circShape(x, 0, 0.52); r.holes.push(circPath(x, 0, 0.4)); add(slab(r, 0.04, 0.03, 0.34), brass()); });
    },
    toolbox() {
      // Warm wood body, red open lid at the back, cream 3-well tray (left), steel NEXT pair (right), brass hinges + latch. Wide (~3:1) to fill the 340x108 slot.
      const red = paint(spec.hex, 0.3);
      const redDark = paint(shade(spec.hex, 0.62), 0.4);
      const L = 9.6, D = 2.2, H = 0.6;
      const bodyWood = wood(0xd9954a, [L, D], { seed: 21 });
      const outer = rrect(L, D, 0.24);
      outer.holes.push(rrectPath(0, 0, L - 0.6, D - 0.6, 0.16)); // open cavity, wood walls
      add(slab(outer, H, 0.06), [bodyWood, plain(0xa8672a, 0.6)]);
      add(slab(rrect(L - 0.2, D - 0.2, 0.22), 0.14, 0.02), wood(0x8a5222, [L, D], { seed: 8 })); // cavity floor, dark wood
      // red trim strip on the rim all round the cavity
      const rim = rrect(L - 0.5, D - 0.5, 0.18); rim.holes.push(rrectPath(0, 0, L - 0.78, D - 0.78, 0.14));
      
      // cream tray with 3 deep wells (left)
      const cw = 5.3, cx = -1.8, th = 1.55;
      const cream = rrect(cw, th, 0.14);
      [-1.75, 0, 1.75].forEach((x) => cream.holes.push(rrectPath(x, 0, 1.55, th - 0.4, 0.22)));
      add(slab(cream, 0.5, 0.05, 0.16), plain(0xf3e4bc, 0.5), cx, 0, 0);
      add(slab(rrect(cw - 0.02, th - 0.02, 0.14), 0.05, 0.02, 0.16), plain(0xb89d6c, 0.75), cx, 0, 0); // well floors, darker = depth
      // steel pair with 2 square wells (right)
      const sw = 3.0, sx = 2.9;
      const steel = rrect(sw, th, 0.14);
      [-0.75, 0.75].forEach((x) => steel.holes.push(rrectPath(x, 0, 1.15, th - 0.55, 0.12)));
      add(slab(steel, 0.5, 0.05, 0.16), metal(0xc3c9d2, 0.32), sx, 0, 0);
      add(slab(rrect(sw - 0.02, th - 0.02, 0.14), 0.05, 0.02, 0.16), plain(0x2a2a32, 0.8), sx, 0, 0);
      // lid: wide red slab standing at the back, leaning away from the camera, darker red inner panel
      const LH = 1.3;
      const lidPivot = new T.Group(); lidPivot.position.set(0, H, -D / 2 + 0.05); lidPivot.rotation.x = -0.6; group.add(lidPivot);
      const lid = slab(rrect(L, LH, 0.22), 0.16, 0.05); lid.rotateX(Math.PI / 2); lid.translate(0, LH / 2, 0);
      add(lid, red, 0, 0, 0.08, lidPivot);
      const panel = slab(rrect(L - 0.7, LH - 0.5, 0.14), 0.03, 0.02); panel.rotateX(Math.PI / 2); panel.translate(0, LH / 2, 0);
      add(panel, redDark, 0, 0, 0.28, lidPivot);
      // brass latch, top centre of the lid
      add(new T.BoxGeometry(1.0, 0.38, 0.14), brass(), 0, LH - 0.05, 0.34, lidPivot);
      add(new T.BoxGeometry(0.6, 0.15, 0.16), plain(0x5a3a1a, 0.5), 0, LH - 0.05, 0.43, lidPivot);
      // two brass hinges where the lid meets the body
      [-3.8, 3.8].forEach((x) => { add(new T.BoxGeometry(0.9, 0.5, 0.1), brass(), x, 0.3, 0.38, lidPivot); add(new T.CylinderGeometry(0.11, 0.11, 0.9, 20).rotateZ(Math.PI / 2), brass(), x, 0.06, 0.42, lidPivot); });
    },
    beam() {
      // Big deep round wells (~66% of the beam height), no end pegs, so the content fills the slot.
      const L = 7.1, Dp = 1.3, R = 0.46;
      const s = rrect(L, Dp, 0.22);
      const xs = [-2.4, -1.2, 0, 1.2, 2.4];
      xs.forEach((x) => s.holes.push(circPath(x, 0, R)));
      const span = [L, Dp];
      add(slab(s, 0.7, 0.06, 0.12), [wood(0xf2b86a, span, { seed: 11 }), plain(0xc07f3e, 0.6)]);
      add(slab(rrect(L - 0.06, Dp - 0.06, 0.2), 0.12, 0.02), plain(0x4a2c12, 0.9)); // deep well floors, dark
    },
    nextbox() {
      const outer = rrect(2.0, 1.6, 0.2);
      outer.holes.push(rrectPath(0, 0, 1.4, 1.0, 0.16));
      add(slab(outer, 0.55, 0.06), metal(0xc3c9d2, 0.3));
      add(slab(rrect(1.9, 1.5, 0.18), 0.1, 0.02), plain(0x1e1e25, 0.85)); // darker well floor
      add(slab((() => { const r = rrect(1.5, 1.1, 0.18); r.holes.push(rrectPath(0, 0, 1.38, 0.98, 0.15)); return r; })(), 0.03, 0.02, 0.62), metal(0x8a919d, 0.45));
    },
    turntable() {
      // Round turntable: radial planks (strong value gaps, grain along each plank), thick bevelled rim, darker rim wood.
      const R = 3, span = [2 * R, 2 * R];
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      const g2 = c.getContext('2d');
      let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const PL = 8, tones = [1.0, 0.72, 1.14, 0.62, 0.92, 1.22, 0.7, 1.06];
      g2.fillStyle = '#7a4a1e'; g2.fillRect(0, 0, 1024, 1024);
      for (let p = 0; p < PL; p++) {
        const a0 = (p / PL) * Math.PI * 2 + 0.012, a1 = ((p + 1) / PL) * Math.PI * 2 - 0.012;
        const f = tones[p];
        g2.save(); g2.beginPath(); g2.moveTo(512, 512); g2.arc(512, 512, 520, a0, a1); g2.closePath(); g2.clip();
        g2.fillStyle = `rgb(${Math.min(255, 238 * f) | 0},${Math.min(255, 168 * f) | 0},${Math.min(255, 92 * f) | 0})`; g2.fillRect(0, 0, 1024, 1024);
        const am = (a0 + a1) / 2; g2.translate(512, 512); g2.rotate(am); // grain runs along the plank (radially)
        for (let i = 0; i < 90; i++) {
          const w = (rnd() - 0.5) * 2 * 512 * Math.sin((a1 - a0) / 2) * 1.05, x0 = 20 + rnd() * 300, len = 120 + rnd() * 380;
          g2.strokeStyle = rnd() < 0.5 ? 'rgba(90,50,18,0.30)' : 'rgba(255,225,170,0.26)'; g2.lineWidth = 1 + rnd() * 3;
          g2.beginPath(); g2.moveTo(x0, w); g2.bezierCurveTo(x0 + len / 3, w + (rnd() - 0.5) * 8, x0 + len * 0.66, w + (rnd() - 0.5) * 8, x0 + len, w + (rnd() - 0.5) * 6); g2.stroke();
        }
        g2.restore();
        g2.strokeStyle = 'rgba(60,30,10,0.85)'; g2.lineWidth = 5; // dark seam between planks
        g2.beginPath(); g2.moveTo(512, 512); g2.lineTo(512 + Math.cos(a0 - 0.012) * 520, 512 + Math.sin(a0 - 0.012) * 520); g2.stroke();
      }
      const grad = g2.createRadialGradient(512, 512, 330, 512, 512, 512); // worn, darker outer ring under the bevel
      grad.addColorStop(0, 'rgba(70,35,10,0)'); grad.addColorStop(1, 'rgba(70,35,10,0.35)'); g2.fillStyle = grad; g2.fillRect(0, 0, 1024, 1024);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
      tex.repeat.set(1 / span[0], 1 / span[1]); tex.offset.set(0.5, 0.5);
      const top = new T.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35 });
      const sh = circShape(0, 0, R);
      const g = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.16, bevelSegments: 6, curveSegments: 128 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.2, 0);
      add(g, [top, wood(0xb9772f, [3, 1], { seed: 4 })]);
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
      ground.visible = true; key.position.set(-0.9, 10, 1.4); // near-overhead for the shadow pass: short shadow, stays in the slot
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

const FIT_PAD = 0.065; // padding per side on the limiting axis (6-10% rule)
async function unionBBox(bufs, rw, rh) {
  let x0 = rw, y0 = rh, x1 = -1, y1 = -1;
  for (const b of bufs) {
    const a = await sharp(b).ensureAlpha().extractChannel(3).raw().toBuffer();
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) if (a[y * rw + x] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
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
  if (NOSHADOW) s.shadow = 0;
  const frames = await page.evaluate((sp, w, h) => window.pageMain(sp, w, h), s, rw, rh);
  const done = [];
  for (const f of frames) done.push(await finish(f, s, rw, rh));
  // Fit to the manifest slot: union alpha bbox over all frames (same crop for every spin frame, so the strip does not jitter),
  // uniform scale so the limiting axis leaves FIT_PAD each side, centred. Shadow and ink are inside the bbox.
  const bb = await unionBBox(done, rw, rh);
  const isVar = s.id.endsWith('_slot');
  const dir = isVar ? join(OUT, 'variants') : OUT;
  const outs = [];
  for (const [label, mult] of [['2x', 2], ['1x', 1]]) {
    const cellW = s.w * mult, cellH = s.h * mult;
    const st = ['toolbox', 'beam', 'turntable'].includes(s.kind) ? 1.1 : 1; // stretch allowance, furniture only (screws stay true)
    const kx = cellW * (1 - 2 * FIT_PAD) / bb.w, ky = cellH * (1 - 2 * FIT_PAD) / bb.h, k = Math.min(kx, ky); // up to 10% non-uniform stretch to hit the slot
    const tw = Math.max(1, Math.round(bb.w * Math.min(kx, k * st))), th = Math.max(1, Math.round(bb.h * Math.min(ky, k * st)));
    const cells = await Promise.all(done.map(async (d) => {
      const part = await sharp(d).extract({ left: bb.x, top: bb.y, width: bb.w, height: bb.h }).resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
      return sharp({ create: { width: cellW, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: part, left: Math.round((cellW - tw) / 2), top: Math.round((cellH - th) / 2) }]).png().toBuffer();
    }));
    let img;
    if (cells.length === 1) img = cells[0];
    else img = await sharp({ create: { width: cellW * cells.length, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(cells.map((c, i) => ({ input: c, left: i * cellW, top: 0 }))).png().toBuffer();
    writeFileSync(join(dir, label, `${s.id}.png`), img);
    outs.push(`${label} ${cellW * cells.length}x${cellH}`);
  }
  log.push(`${s.id}: ${outs.join(', ')}  (render ${rw}x${rh}, content aspect ${(bb.w / bb.h).toFixed(2)} vs slot ${(s.w / s.h).toFixed(2)})`);
  console.log(log[log.length - 1]);
}
await browser.close();
