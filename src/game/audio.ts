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

function noise(dur: number, vol: number, delay = 0, hp = 800) {
  if (!ctx || !master || !audioSettings.on || voices > 10) return;
  try {
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
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

const NOTES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const note = (base: number, step: number) => base * Math.pow(2, NOTES[Math.min(step, NOTES.length - 1)] / 12);

export const sfx = {
  pickup: () => tone(520, 0.06, 'triangle', 0.15),
  drop: () => tone(300, 0.07, 'triangle', 0.15),
  invalid: () => tone(180, 0.12, 'square', 0.06, 0, 120),
  merge: (rank: number) => {
    tone(note(330, rank * 2), 0.14, 'triangle', 0.35, 0, note(330, rank * 2 + 1));
    noise(0.05, 0.15, 0, 3000);
  },
  cascadeStep: (i: number, delay: number) => tone(note(440, i), 0.09, 'sine', 0.12, delay),
  cannon: (delay = 0, big = false) => {
    tone(big ? 110 : 160, 0.12, 'square', big ? 0.18 : 0.06, delay, 50);
    noise(0.08, big ? 0.2 : 0.06, delay, 400);
  },
  hit: (big: boolean) => {
    noise(big ? 0.25 : 0.08, big ? 0.35 : 0.12, 0, 200);
    tone(big ? 90 : 140, big ? 0.3 : 0.1, 'sawtooth', big ? 0.2 : 0.08, 0, 40);
  },
  chord: (n: number) => {
    const base = 220 * Math.pow(2, Math.min(n, 20) / 24);
    for (const m of [1, 1.25, 1.5, 2]) tone(base * m, 0.35, 'triangle', 0.1);
    noise(0.2, 0.15, 0, 300);
  },
  rankUp: (rank: number) => {
    for (let i = 0; i < 3; i++) tone(note(523, rank + i * 2), 0.12, 'square', 0.08, i * 0.06);
  },
  delivery: () => tone(700, 0.04, 'sine', 0.06),
  scrap: () => noise(0.15, 0.2, 0, 1500),
  kill: () => {
    noise(0.7, 0.5, 0, 100);
    for (let i = 0; i < 5; i++) tone(note(220, i * 2), 0.2, 'square', 0.12, i * 0.07);
  },
  overdrive: () => {
    for (let i = 0; i < 6; i++) tone(note(260, i * 2), 0.12, 'sawtooth', 0.1, i * 0.04);
  },
  kickback: () => {
    tone(900, 0.25, 'sine', 0.15, 0, 300);
    noise(0.1, 0.2, 0.22, 600);
  },
  click: () => tone(800, 0.03, 'triangle', 0.1),
  win: () => {
    for (let i = 0; i < 8; i++) tone(note(330, i), 0.25, 'triangle', 0.18, i * 0.08);
  },
  lose: () => {
    for (let i = 0; i < 4; i++) tone(note(220, 6 - i * 2), 0.3, 'triangle', 0.15, i * 0.15);
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