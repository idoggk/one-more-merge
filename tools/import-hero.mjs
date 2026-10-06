// Import ChatGPT's v10 home/machine pack (layered "YOUR MACHINE" + Bolts UI) into src/assets/art as WebP.
// Usage: node tools/import-hero.mjs art_inbox/v10/assets
// Sprites are trimmed to their visible pixels so the in-game assembly can anchor by visible bounds (ASSEMBLY.json).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const src = process.argv[2] ?? 'art_inbox/v10/assets';
const out = 'src/assets/art';
const jobs = [];
for (const f of readdirSync(src).filter((f) => f.endsWith('.png'))) {
  const n = basename(f, '.png');
  let key = null;
  let box = 256;
  let trim = true;
  const m = n.match(/^hero_module_(\w+)_t([123])$/);
  if (m) [key, box] = [`hm_${m[1]}_${m[2]}`, 300];
  else if (/^role_(\w+)_icon$/.test(n)) [key, box] = [`role_${n.match(/^role_(\w+)_icon$/)[1]}`, 128];
  else if (/^rocket_r0([1-6])$/.test(n)) [key, box] = [`rocket_${n.match(/^rocket_r0([1-6])$/)[1]}`, 256];
  else if (n === 'ui_coach_compact_plate') [key, box] = ['ui_coach_compact', 720];
  else if (n === 'hero_workshop_button_plate') [key, box] = ['btn_workshop', 640];
  else if (n === 'ui_secondary_brass_button_plate') [key, box] = ['btn_brass', 512];
  else if (n === 'ui_team_builder_panel') [key, box] = ['ui_team_panel', 720];
  else if (n === 'ui_team_slot_plate') [key, box] = ['ui_team_slot', 320];
  else if (n === 'ui_team_slot_selected_frame') [key, box] = ['ui_team_slot_sel', 320];
  else if (/^path_node_(\w+)$/.test(n)) [key, box] = [`node_${n.match(/^path_node_(\w+)$/)[1]}`, 200];
  else if (n === 'path_road_segment') [key, box] = ['road_seg', 400];
  else if (n === 'path_star_filled') [key, box] = ['star', 96];
  else if (/^path_worker_(\w+)$/.test(n)) [key, box] = [`worker_${n.match(/^path_worker_(\w+)$/)[1]}`, 200];
  else if (/^booster_(\w+)_icon$/.test(n)) [key, box] = [`booster_${n.match(/^booster_(\w+)_icon$/)[1]}`, 128];
  else if (n === 'home_road_background_v14') [key, box, trim] = ['road_bg', 720, false];
  else if (n === 'ui_event_card_plate') [key, box] = ['ui_card', 720];
  else if (n === 'ui_consumable_button_plate') [key, box] = ['ui_consumable', 320];
  else if (/^(cannon|coil|bell)_r0([78])$/.test(n)) [key, box] = [n.replace(/_r0/, '_'), 256];
  else if (/^rocket_r0([78])$/.test(n)) [key, box] = [`rocket_${n.slice(-1)}`, 256];
  else if (n === 'hero_home_background') [key, box, trim] = ['hero_bg', 720, false];
  else if (n === 'hero_machine_chassis') [key, box] = ['hero_chassis', 900];
  else if (n === 'hero_mount_socket') [key, box] = ['hero_socket', 160];
  else if (n === 'resource_bolts_icon') [key, box] = ['bolt', 96];
  else if (n === 'hero_resources_bar_plate') [key, box] = ['res_bar', 640];
  if (key) jobs.push({ f: join(src, f), key, box, trim });
  else console.log('skip:', f);
}
for (const j of jobs) {
  const img = j.trim ? sharp(j.f).trim({ threshold: 32 }) : sharp(j.f);
  const buf = await img.png().toBuffer();
  const resized = j.key === 'hero_bg' ? sharp(buf).resize({ width: j.box }) : sharp(buf).resize(j.box, j.box, { fit: 'inside' });
  await resized.webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(join(out, `${j.key}.webp`));
  console.log(`${basename(j.f)} -> ${j.key}`);
}
