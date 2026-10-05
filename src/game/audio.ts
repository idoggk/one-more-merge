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
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

// ---------- music: tiny generative groove (kick / hat / bass arpeggio) ----------
const music = { on: false, timer: 0 as unknown as ReturnType<typeof setInterval>, step: 0, next: 0, intense: false, bpm: 112 };
const BASS = [0, 0, 7, 0, 5, 5, 3, 5]; // semitones over A1

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
  o.connect(g).connect(master);
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
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

function schedule() {
  if (!ctx || !music.on || !audioSettings.on || !audioSettings.music) return;
  const spb = 60 / (music.bpm * (music.intense ? 1.25 : 1)) / 2; // eighth notes
  while (music.next < ctx.currentTime + 0.2) {
    const t = music.next;
    const s = music.step % 16;
    if (s % 4 === 0) mtone(120, t, 0.18, 'sine', 0.22, 40); // kick
    if (s % 2 === 1 || music.intense) mnoise(t, 0.04, music.intense ? 0.06 : 0.035); // hat
    if (s === 4 || s === 12) mnoise(t, 0.12, 0.05); // snare-ish
    const n = BASS[Math.floor(s / 2) % BASS.length] + (music.step % 32 >= 16 ? -2 : 0);
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