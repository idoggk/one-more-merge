import Phaser from 'phaser';
import { GameScene, H, W } from './game/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f3cf9b',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  input: { activePointers: 1 },
  scene: [GameScene],
});

// expose for debugging / automated checks
(window as unknown as { __omm: unknown }).__omm = { Phaser };
