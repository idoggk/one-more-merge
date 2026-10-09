import Phaser from 'phaser';
import { audioSettings, sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY } from '../../platform/backup';
import { store } from '../meta';
import type { GameScene } from '../GameScene';
import { W, H } from '../sceneKit';

export function openPause(scene: GameScene) {
  if (scene.modal || scene.s.phase === 'won' || scene.s.phase === 'lost') return;
  scene.cancelDrag();
  const c = scene.panel(scene.s.phase === 'tutorial' ? 840 : 730);
  const top = H / 2 - (scene.s.phase === 'tutorial' ? 420 : 365);
  c.add(scene.add.text(W / 2, top + 70, 'PAUSED', { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#3b2533' }).setOrigin(0.5));
  scene.button(c, W / 2, top + 190, 420, 'RESUME', 0x5fbf4a, () => scene.closeModal());
  const snd = scene.button(c, W / 2, top + 300, 420, `SOUND: ${scene.meta.sound ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
    scene.meta.sound = !scene.meta.sound;
    audioSettings.on = scene.meta.sound;
    store(META_KEY, JSON.stringify(scene.meta));
    (snd.list[1] as Phaser.GameObjects.Text).setText(`SOUND: ${scene.meta.sound ? 'ON' : 'OFF'}`);
  });
  const mus = scene.button(c, W / 2, top + 410, 420, `MUSIC: ${scene.meta.music ? 'ON' : 'OFF'}`, 0x27a4c0, () => {
    scene.meta.music = !scene.meta.music;
    audioSettings.music = scene.meta.music;
    store(META_KEY, JSON.stringify(scene.meta));
    (mus.list[1] as Phaser.GameObjects.Text).setText(`MUSIC: ${scene.meta.music ? 'ON' : 'OFF'}`);
  });
  // UI audit: at +-108 the two pills overlapped; +-125 leaves a clear gap between them
  scene.button(c, W / 2 + 125, top + 520, 200, 'RESTART', 0xe8452c, () => scene.retry());
  scene.button(c, W / 2 - 125, top + 520, 200, 'HOME', 0x27a4c0, () => scene.quitHome());
  const ex = scene.add.text(W / 2, top + (scene.s.phase === 'tutorial' ? 796 : 684), 'export playtest log', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#8a6a4a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  ex.on('pointerup', () => {
    try {
      const blob = new Blob([tlog.exportText()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `one-more-merge-playtest-${Date.now()}.json`;
      a.click();
      ex.setText('saved ✓');
    } catch {
      ex.setText('export failed');
    }
  });
  c.add(ex);
  const linkY = top + (scene.s.phase === 'tutorial' ? 720 : 612);
  const shk = scene.add.text(W / 2 + 140, linkY, `Shake: ${scene.meta.shake === false ? 'OFF' : 'ON'}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5);
  scene.tapLink(shk, () => {
    sfx.click();
    scene.meta.shake = scene.meta.shake === false;
    store(META_KEY, JSON.stringify(scene.meta));
    shk.setText(`Shake: ${scene.meta.shake === false ? 'OFF' : 'ON'}`);
    if (scene.meta.shake) scene.shake(90, 0.003);
  });
  c.add(shk);
  const how = scene.add.text(W / 2 - 120, linkY, 'Machine guide', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5);
  scene.tapLink(how, () => {
    sfx.click();
    scene.openHowTo(0, () => scene.openPause());
  });
  c.add(how);
  if (scene.s.phase === 'tutorial') scene.button(c, W / 2, top + 630, 420, 'SKIP TUTORIAL', 0x8a6a4a, () => scene.skipTutorial());
}
