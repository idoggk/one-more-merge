// Screw Yard 3D sprite renderer (approach B in docs/design/SCREW_YARD_3D_ASSETS.md).
// Builds each asset from three.js primitives, lights it with ONE fixed rig, renders to a transparent PNG in headless Chrome.
// Usage: node tools/render-yard-3d.mjs [--out art-candidates/screw-yard-3d] [--size 512] [--only screw_red,nut]
// Needs: npm install (three@0.170.0, puppeteer-core, sharp) and Chrome (env CHROME overrides the default path).
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', 'art-candidates/screw-yard-3d');
const SIZE = Number(arg('size', 512));
const ONLY = arg('only', '') ? arg('only', '').split(',') : null;
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const threeSrc = readFileSync('node_modules/three/build/three.cjs', 'utf8');

// Same palette as the game (ScrewScene.SCREW_COLORS, PLATE_TINTS, INK).
const SPEC = [
  { name: 'screw_red', kind: 'screw', color: 0xe8452c },
  { name: 'screw_blue', kind: 'screw', color: 0x27a4c0 },
  { name: 'screw_gold', kind: 'screw', color: 0xf2c12e },
  { name: 'nut', kind: 'nut', color: 0xc9d1d9 },
  { name: 'plank', kind: 'plank', color: 0xb08d57 },
  { name: 'box', kind: 'box', color: 0xd46a6a },
].filter((s) => !ONLY || ONLY.includes(s.name));

// Runs inside the page. One camera, one light rig, one ink outline: identical for every asset.
function pageMain(spec, size) {
  const T = window.THREE;
  const INK = 0x2b1d2e;
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();

  // ---- fixed rig: key top-left, cool fill, warm rim from the back right, soft contact shadow ----
  scene.add(new T.HemisphereLight(0xfff1dc, 0x6b5a7a, 0.9));
  const key = new T.DirectionalLight(0xffffff, 2.6);
  key.position.set(-4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new T.DirectionalLight(0xffd9a0, 1.2);
  rim.position.set(5, 3, -4);
  scene.add(rim);
  const ground = new T.Mesh(new T.PlaneGeometry(20, 20), new T.ShadowMaterial({ opacity: 0.38, color: 0x2b1d2e }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- fixed camera: orthographic, pitch 30, yaw 35 (same as the yard's turned view) ----
  const cam = new T.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 50);
  const yaw = (35 * Math.PI) / 180, pitch = (30 * Math.PI) / 180, dist = 12;
  cam.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
  cam.lookAt(0, 0.45, 0);

  const metal = (c, r = 0.32) => new T.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: r });
  const paint = (c, r = 0.38) => new T.MeshStandardMaterial({ color: c, metalness: 0.05, roughness: r });
  const ink = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
  const group = new T.Group();
  scene.add(group);
  const add = (geo, mat, x = 0, y = 0, z = 0, outline = 0.03) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (outline) { // inverted hull ink outline, one weight for every asset
      geo.computeVertexNormals();
      const o = new T.Mesh(geo, new T.ShaderMaterial({ side: T.BackSide, uniforms: { w: { value: outline } },
        vertexShader: 'uniform float w; void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position+normal*w,1.0); }',
        fragmentShader: 'void main(){ gl_FragColor = vec4(0.169,0.114,0.180,1.0); }' }));
      o.position.copy(m.position);
      group.add(o);
    }
    return m;
  };
  const rrect = (w, h, r) => {
    const s = new T.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const hole = (x, z, r) => { const p = new T.Path(); p.absarc(x, z, r, 0, Math.PI * 2, true); return p; };
  // extrude a 2D shape upwards (shape lies in XZ, thickness along +Y) with a soft bevel
  const slab = (shape, depth, bevel) => {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    return g;
  };

  const builders = {
    screw(c) { // domed round head, Phillips cross, short threaded shank pointing down-and-away is hidden: head-on sprite
      const head = new T.LatheGeometry([[0, 0.34], [0.2, 0.33], [0.4, 0.29], [0.52, 0.2], [0.55, 0.12], [0.5, 0.04], [0.5, 0], [0, 0]].reverse().map(([x, y]) => new T.Vector2(x, y)), 48);
      add(head, paint(c, 0.28), 0, 0.1, 0);
      add(new T.TorusGeometry(0.5, 0.035, 12, 48).rotateX(Math.PI / 2), metal(0xdfe5ea, 0.25), 0, 0.14, 0, 0.012); // steel collar ring
      const slot = new T.MeshStandardMaterial({ color: 0x3a2a30, roughness: 0.8 });
      add(new T.BoxGeometry(0.62, 0.05, 0.1), slot, 0, 0.43, 0, 0);
      add(new T.BoxGeometry(0.1, 0.05, 0.62), slot, 0, 0.43, 0, 0);
      group.rotation.y = 0.4;
    },
    nut(c) { // hex nut with a real bore and chamfered corners
      const s = new T.Shape();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * 0.62, Math.sin(a) * 0.62); }
      s.holes.push(hole(0, 0, 0.26));
      add(slab(s, 0.36, 0.05), metal(c, 0.3), 0, 0, 0);
      add(new T.TorusGeometry(0.3, 0.02, 8, 36).rotateX(Math.PI / 2), metal(0x8d98a4, 0.4), 0, 0.46, 0, 0);
    },
    plank(c) { // a board with 3 screw holes and a darker routed rim
      const s = rrect(2.4, 0.9, 0.1);
      [-0.8, 0, 0.8].forEach((x) => s.holes.push(hole(x, 0, 0.15)));
      add(slab(s, 0.22, 0.04), paint(c, 0.7), 0, 0, 0);
      [-0.8, 0, 0.8].forEach((x) => add(new T.TorusGeometry(0.2, 0.025, 8, 32).rotateX(Math.PI / 2), metal(0xb8c0c8, 0.35), x, 0.3, 0, 0.01));
      group.rotation.y = 0.0;
    },
    box(c) { // the open toolbox body: hollow tray with brass corner studs and three holes in the lid row
      const outer = rrect(2.2, 1.3, 0.14);
      add(slab(outer, 0.5, 0.05), paint(c, 0.45), 0, 0, 0);
      const lidHoles = rrect(2.2, 1.3, 0.14);
      [-0.65, 0, 0.65].forEach((x) => add(new T.CylinderGeometry(0.22, 0.22, 0.05, 32), new T.MeshStandardMaterial({ color: 0x24181f, roughness: 0.9 }), x, 0.61, 0, 0));
      [[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].forEach(([x, z]) => add(new T.SphereGeometry(0.1, 20, 14), metal(0xd9a441, 0.3), x, 0.6, z, 0.012));
      add(new T.BoxGeometry(2.24, 0.07, 0.12), metal(0xd9a441, 0.3), 0, 0.32, 0.66, 0.01); // brass band
    },
  };
  builders[spec.kind](spec.color);

  // centre and fit: scale the group so every asset fills the frame the same way (padding 8%)
  const box = new T.Box3().setFromObject(group);
  const c = box.getCenter(new T.Vector3());
  group.position.x -= c.x; group.position.z -= c.z; group.position.y -= box.min.y;
  scene.updateMatrixWorld(true);
  key.target.position.set(0, 0, 0);
  const b2 = new T.Box3().setFromObject(group);
  const ext = Math.max(b2.max.x - b2.min.x, b2.max.y - b2.min.y, b2.max.z - b2.min.z);
  const k = Math.min(1.6, 2.4 / ext) ; // keep real relative scale up to a cap
  group.scale.setScalar(k);
  group.position.multiplyScalar(k);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setContent('<canvas></canvas>');
await page.addScriptTag({ content: `var module={exports:{}};var exports=module.exports;${threeSrc};window.THREE=module.exports;` });
await page.evaluate(`window.pageMain = ${pageMain.toString()}`);
const log = [];
for (const s of SPEC) {
  // 2x supersample then downscale: clean edges without relying on MSAA in software GL
  const url = await page.evaluate((sp, sz) => window.pageMain(sp, sz), s, SIZE * 2);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  const png = await sharp(buf).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).toBuffer();
  const meta = await sharp(png).metadata();
  const inner = Math.round(SIZE * 0.84);
  const fitted = await sharp(png).resize(inner, inner, { fit: 'inside' }).toBuffer();
  const fm = await sharp(fitted).metadata();
  const left = Math.floor((SIZE - fm.width) / 2), top = Math.floor((SIZE - fm.height) / 2);
  const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, left, top }]).png().toBuffer();
  writeFileSync(join(OUT, `${s.name}.png`), out);
  log.push(`${s.name}: trimmed ${meta.width}x${meta.height} -> ${SIZE}x${SIZE}`);
}
await browser.close();
// contact sheets on dark and light, plus a 70 px strip to test small-size read
const files = SPEC.map((s) => join(OUT, `${s.name}.png`));
for (const [name, bg] of [['contact-dark', '#3a2f3d'], ['contact-light', '#f3e3c3']]) {
  const cell = 256;
  const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(cell, cell).toBuffer(), left: (i % 3) * cell, top: Math.floor(i / 3) * cell })));
  await sharp({ create: { width: cell * 3, height: cell * Math.ceil(files.length / 3), channels: 4, background: bg } }).composite(comps).png().toFile(join(OUT, `${name}.png`));
}
console.log(log.join('\n'));
