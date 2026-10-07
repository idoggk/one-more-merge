// Tiny original WebAudio synth. Starts only after a user gesture; never throws.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices = 0;
export const audioSettings = { on: true, music: true };

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  if (!ctx || !master || !audioSettings.on || voices > 10) return;
  try {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    voices++;
    o.onended = () => voices--;
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

// Sound design follows ChatGPT's SOUND_DESIGN_BRIEF (ten key sounds). Cosmetic variation uses Math.random, never game RNG.
const NOTES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const note = (base: number, step: number) => base * Math.pow(2, NOTES[Math.min(step, NOTES.length - 1)] / 12);
const PHRASE = [0, 4, 7, 12]; // cascade phrase: max four rising steps, then resolve
const vary = (f: number) => f * (1 + (Math.random() - 0.5) * 0.04);

function bandNoise(dur: number, vol: number, delay: number, freq: number, q = 1.5) {
  if (!ctx || !master || !audioSettings.on || voices > 12) return;
  try {
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    voices++;
    src.onended = () => voices--;
    src.start(t);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  // ---- meta UI sounds (ChatGPT r18 recipes; UI bus ~10 dB under merge payloads) ----
  /** Road node tap: woody physical tick. */
  nodeTap: () => {
    tone(600, 0.065, 'triangle', 0.06, 0, 420);
    bandNoise(0.012, 0.05, 0, 1800);
  },
  /** Level card open: air sweep + muted arrival tap. */
  cardOpen: () => {
    bandNoise(0.14, 0.05, 0, 1600, 0.8);
    tone(350, 0.08, 'sine', 0.05, 0.11);
  },
  /** Star k (0..2): 660/830/990 Hz, 140 ms apart by caller; the third adds a quiet 1320 Hz resolve. */
  star: (k: number) => {
    const f = [660, 830, 990][Math.min(2, k)];
    tone(f, 0.13, 'triangle', 0.08);
    tone(f * 2, 0.13, 'sine', 0.02);
    if (k >= 2) tone(1320, 0.18, 'sine', 0.035, 0.14);
  },
  /** Chest: two woody knocks + rattle, then the open creak and a rounded thunk. */
  chestShake: () => {
    for (const d of [0, 0.09]) {
      tone(200, 0.045, 'triangle', 0.08, d, 150);
      bandNoise(0.04, 0.04, d, 3200, 3);
    }
  },
  chestOpen: () => {
    bandNoise(0.22, 0.05, 0, 900, 1.2);
    tone(260, 0.2, 'sawtooth', 0.02, 0, 160);
    tone(180, 0.18, 'sine', 0.1, 0.16);
  },
  /** Medal reveal: 523 -> 659 -> 784 Hz flourish, 75 ms apart, with a faint 1.5x partial. */
  medal: () => {
    [523, 659, 784].forEach((f, i) => {
      tone(f, 0.26, 'triangle', 0.07, i * 0.075);
      tone(f * 1.5, 0.2, 'sine', 0.015, i * 0.075);
    });
  },
  /** Bolt roll-up: a few soft ticks (never one per Bolt) and a final clink. */
  boltRoll: (ticks = 6) => {
    const n = Math.min(8, ticks);
    for (let i = 0; i < n; i++) tone(900 + Math.random() * 200, 0.025, 'square', 0.015, i * 0.06);
    tone(660, 0.09, 'triangle', 0.05, n * 0.06);
  },
  /** Booster commits: Kit = ratchet + lift; Capsule = click + glassy swell. Cancelled holds make no success sound. */
  kit: () => {
    for (let i = 0; i < 4; i++) bandNoise(0.02, 0.05, i * 0.04, 2400, 4);
    tone(300, 0.18, 'triangle', 0.06, 0.12, 600);
  },
  capsule: () => {
    bandNoise(0.015, 0.06, 0, 3000);
    tone(700, 0.25, 'sine', 0.06, 0.02, 1000);
    tone(1400, 0.2, 'sine', 0.015, 0.05, 2000);
  },
  /** Lesson bubble appears: soft paper puff. */
  lessonPop: () => {
    bandNoise(0.08, 0.04, 0, 1200, 0.7);
    tone(450, 0.06, 'sine', 0.025);
  },
  pickup: () => bandNoise(0.03, 0.12, 0, 2500),
  drop: () => tone(300, 0.06, 'triangle', 0.12),
  invalid: () => tone(180, 0.12, 'square', 0.05, 0, 120),
  /** merge_rank_up: click + bright upward bloop; higher ranks add fullness, not endless pitch. */
  merge: (rank: number) => {
    bandNoise(0.025, 0.3, 0, 3000);
    tone(vary(300), 0.14, 'triangle', 0.3, 0.01, 650);
    if (rank >= 3) tone(vary(150), 0.16, 'sine', 0.18, 0.01, 325);
    if (rank >= 5) tone(vary(600), 0.12, 'sine', 0.08, 0.02, 1300);
  },
  rankUp: (rank: number) => tone(note(523, Math.min(rank, 6)), 0.1, 'triangle', 0.14, 0.06),
  /** cascade_phrase: one soft pluck per presentation beat (depth), max 4 rising steps. */
  cascadeStep: (beat: number, delay: number) => {
    const semi = PHRASE[Math.min(beat, PHRASE.length - 1)];
    tone(440 * Math.pow(2, semi / 12), 0.12, 'triangle', 0.1, delay);
  },
  /** phrase resolution on the biggest shot */
  chord: (n: number) => {
    const root = 220 * (n >= 10 ? 1.5 : 1);
    for (const m of [1, 1.26, 1.5]) tone(root * m, 0.4, 'triangle', 0.08);
    tone(root / 2, 0.3, 'sine', 0.12);
  },
  /** cannon_fire: passive = cork pop; payload = pressure release + body thump with midrange weight. */
  cannon: (delay = 0, big = false) => {
    if (big) {
      tone(vary(400), 0.05, 'square', 0.08, delay, 250);
      tone(vary(180), 0.2, 'triangle', 0.22, delay, 70);
      bandNoise(0.16, 0.25, delay, 600, 0.8);
      tone(90, 0.18, 'sine', 0.14, delay + 0.01, 50);
    } else {
      tone(vary(320), 0.07, 'triangle', 0.06, delay, 120);
      bandNoise(0.05, 0.06, delay, 1500);
    }
  },
  /** coil_zap: quick elastic zzip */
  zap: (delay = 0) => {
    tone(vary(700), 0.09, 'sawtooth', 0.04, delay, 220);
    tone(vary(700), 0.09, 'triangle', 0.06, delay, 220);
    bandNoise(0.06, 0.05, delay, 4000, 3);
  },
  /** bell_ring: warm brass ding with slightly inharmonic partials */
  bell: (rank: number, delay = 0) => {
    const f0 = vary(520) * (1 - Math.min(rank, 6) * 0.03);
    bandNoise(0.01, 0.1, delay, 5000);
    tone(f0, 0.4 + rank * 0.03, 'sine', 0.1, delay);
    tone(f0 * 2.76, 0.18, 'sine', 0.04, delay);
    tone(f0 * 5.4, 0.08, 'sine', 0.02, delay);
  },
  hit: (big: boolean) => {
    bandNoise(big ? 0.14 : 0.05, big ? 0.22 : 0.07, 0, 400, 0.7);
    if (big) tone(120, 0.16, 'triangle', 0.12, 0, 60);
  },
  /** panel_break: sharp metal snap + two hollow clatters (resonance varies per target) */
  panelBreak: (target: number) => {
    const k = 1 + target * 0.12;
    bandNoise(0.05, 0.35, 0, 3500, 1);
    tone(300 * k, 0.12, 'triangle', 0.12, 0.04);
    tone(470 * k, 0.1, 'triangle', 0.1, 0.09);
  },
  /** kickback_land: tok; fusion adds a separate bright answer */
  kickback: (fused = false) => {
    tone(vary(280), 0.08, 'triangle', 0.18, 0, 200);
    bandNoise(0.03, 0.12, 0, 1200);
    if (fused) {
      tone(600, 0.12, 'triangle', 0.15, 0.06, 1100);
      tone(900, 0.1, 'sine', 0.08, 0.1);
    }
  },
  delivery: () => tone(vary(700), 0.035, 'sine', 0.04),
  scrap: () => {
    bandNoise(0.12, 0.2, 0, 900);
    tone(200, 0.12, 'triangle', 0.08, 0, 90);
  },
  kill: () => {
    bandNoise(0.5, 0.4, 0, 250, 0.6);
    tone(110, 0.4, 'triangle', 0.25, 0, 40);
    for (let i = 0; i < 3; i++) tone(note(330, i * 2), 0.12, 'triangle', 0.1, 0.08 + i * 0.07);
  },
  /** overdrive_start: lever click, engine catches, rising glide */
  overdrive: () => {
    bandNoise(0.02, 0.3, 0, 2000);
    tone(180, 0.35, 'triangle', 0.15, 0.03, 420);
    tone(90, 0.3, 'sawtooth', 0.05, 0.05, 140);
  },
  click: () => bandNoise(0.02, 0.15, 0, 3000),
  /** battery: quick charging zip-up */
  battery: (delay = 0) => {
    tone(220, 0.16, 'square', 0.04, delay, 880);
    tone(880, 0.06, 'triangle', 0.08, delay + 0.15);
  },
  /** fan: soft whoosh */
  fan: (delay = 0) => bandNoise(0.22, 0.14, delay, 700, 0.6),
  /** magnet: low hum swell + metallic clunk */
  magnet: (delay = 0) => {
    tone(110, 0.18, 'sawtooth', 0.05, delay, 220);
    tone(vary(240), 0.08, 'triangle', 0.14, delay + 0.14, 160);
    bandNoise(0.04, 0.15, delay + 0.14, 900);
  },
  /** victory_rebuild: low clunk, three bright plucks resolving into a chord, nut-click */
  win: () => {
    tone(100, 0.2, 'triangle', 0.25, 0, 60);
    [0, 4, 7].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.25, 'triangle', 0.14, 0.18 + i * 0.12));
    for (const s of [0, 4, 7, 12]) tone(523 * Math.pow(2, s / 12), 0.6, 'sine', 0.06, 0.6);
    bandNoise(0.02, 0.2, 0.85, 4000);
  },
  /** defeat_sputter: two uneven pops, downward glide, air release. No punitive buzzer. */
  lose: () => {
    tone(140, 0.08, 'triangle', 0.15, 0, 80);
    tone(120, 0.08, 'triangle', 0.12, 0.13, 70);
    tone(260, 0.35, 'triangle', 0.12, 0.24, 110);
    bandNoise(0.3, 0.06, 0.3, 1200, 0.5);
  },
};
/** iOS Safari has no navigator.vibrate. Since iOS 17.4, toggling an `<input type="checkbox" switch>` plays the
 *  system haptic tick, and clicking its <label> from script does it too. UNDOCUMENTED WebKit behaviour: it may stop
 *  working in any iOS update; it then does nothing (the hidden switch just flips). Built once, lazily. */
let iosTick: HTMLLabelElement | null | undefined;
function iosHapticLabel(): HTMLLabelElement | null {
  if (iosTick !== undefined) return iosTick;
  iosTick = null;
  if (typeof document === 'undefined' || typeof navigator === 'undefined' || !(navigator.maxTouchPoints > 0)) return null;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  iosTick = label;
  return label;
}
export function haptic(ms = 10) {
  try {
    // Android (and anything else with the Vibration API): unchanged
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
      return;
    }
    iosHapticLabel()?.click();
  } catch {
    /* ignore: haptics are a bonus, never an error */
  }
}

// ---------- music: tiny generative groove (kick / hat / bass arpeggio) ----------
const music = { on: false, timer: 0 as unknown as ReturnType<typeof setInterval>, step: 0, next: 0, intense: false, bpm: 112, mode: 'normal' as MusicMode };
const BASS = [0, 0, 7, 0, 5, 5, 3, 5]; // semitones over A1
/** r28 fight themes: bosses get a dark phrygian line, mini-bosses a bouncy one, the final phase pushes tempo + a stab. */
export type MusicMode = 'normal' | 'mini' | 'boss' | 'final';
const MODES: Record<MusicMode, { bass: number[]; bpm: number; stab: boolean }> = {
  normal: { bass: BASS, bpm: 112, stab: false },
  mini: { bass: [0, 3, 5, 3, 0, 7, 5, 3], bpm: 118, stab: false },
  boss: { bass: [0, 0, 1, 0, 3, 3, 1, -2], bpm: 122, stab: true },
  final: { bass: [0, 1, 0, 1, 3, 1, -2, -1], bpm: 132, stab: true },
};
export function setMusicMode(m: MusicMode) {
  music.mode = m;
}

let bus: GainNode | null = null;
/** Music runs through its own bus so big accents can duck it (ChatGPT r9: -3..4 dB in 25 ms, recover 180 ms). */
function musicBus() {
  if (!bus && ctx && master) {
    bus = ctx.createGain();
    bus.connect(master);
  }
  return bus!;
}

export function duckMusic() {
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.linearRampToValueAtTime(0.65, t + 0.025);
  bus.gain.linearRampToValueAtTime(1, t + 0.205);
}

function mtone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicBus());
  o.start(t);
  o.stop(t + dur + 0.02);
}

function mnoise(t: number, dur: number, vol: number) {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(musicBus());
  src.start(t);
}

function schedule() {
  if (!ctx || !music.on || !audioSettings.on || !audioSettings.music) return;
  const md = MODES[music.mode];
  const spb = 60 / (md.bpm * (music.intense ? 1.25 : 1)) / 2; // eighth notes
  while (music.next < ctx.currentTime + 0.2) {
    const t = music.next;
    const s = music.step % 16;
    if (s % 4 === 0) mtone(120, t, 0.18, 'sine', 0.22, 40); // kick
    if (s % 2 === 1 || music.intense) mnoise(t, 0.04, music.intense ? 0.06 : 0.035); // hat
    if (s === 4 || s === 12) mnoise(t, 0.12, 0.05); // snare-ish
    const n = md.bass[Math.floor(s / 2) % md.bass.length] + (music.step % 32 >= 16 && music.mode === 'normal' ? -2 : 0);
    if (md.stab && (s === 0 || s === 6 || s === 10)) mtone(110 * Math.pow(2, (n + 12) / 12), t, spb * 0.5, 'sawtooth', 0.02); // boss stab
    if (s % 2 === 0) mtone(55 * Math.pow(2, n / 12), t, spb * 1.6, 'triangle', 0.09);
    if (music.intense && s % 2 === 1) mtone(220 * Math.pow(2, (n + 12) / 12), t, spb * 0.8, 'square', 0.025);
    music.next += spb;
    music.step++;
  }
}

export function startMusic() {
  if (!ctx || music.on) return;
  music.on = true;
  music.next = ctx.currentTime + 0.05;
  music.timer = setInterval(schedule, 50);
}

export function stopMusic() {
  music.on = false;
  clearInterval(music.timer);
}

export function setMusicIntensity(intense: boolean) {
  music.intense = intense;
}