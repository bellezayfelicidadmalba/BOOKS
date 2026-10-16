/* Produciendo Música — motor de audio (Web Audio API).
   Todo se sintetiza en vivo: no hay samples. */
window.S = window.S || {};
(function (S) {
  const A = (S.audio = {});
  let ctx = null;

  A.ctx = function () {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = ctx.createGain();
      A.master.gain.value = 0.85;
      A.analyser = ctx.createAnalyser();
      A.analyser.fftSize = 4096;
      A.analyser.smoothingTimeConstant = 0.78;
      A.master.connect(A.analyser);
      A.analyser.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  A.ready = () => !!ctx;

  A.mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.dbToGain = (db) => Math.pow(10, db / 20);
  A.gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-6));

  // ---------- noise buffers ----------
  let white = null, pink = null;
  A.whiteBuffer = function () {
    if (white) return white;
    const c = A.ctx(), len = c.sampleRate * 2;
    white = c.createBuffer(1, len, c.sampleRate);
    const d = white.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return white;
  };
  A.pinkBuffer = function () {
    if (pink) return pink;
    const c = A.ctx(), len = c.sampleRate * 4;
    pink = c.createBuffer(1, len, c.sampleRate);
    const d = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return pink;
  };
  A.noise = function (kind, loop) {
    const c = A.ctx(), s = c.createBufferSource();
    s.buffer = kind === "pink" ? A.pinkBuffer() : A.whiteBuffer();
    s.loop = !!loop;
    return s;
  };

  // simple algorithmic reverb impulse
  A.impulse = function (seconds, decay) {
    const c = A.ctx(), len = Math.floor(c.sampleRate * seconds);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  };

  // ---------- drum & instrument voices ----------
  const V = (A.voices = {});
  V.kick = function (dest, t, vel = 1) {
    const c = A.ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45);
    o.connect(g).connect(dest);
    // click
    const n = A.noise(), ng = c.createGain(), hp = c.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 2500;
    ng.gain.setValueAtTime(0.25 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    n.connect(hp).connect(ng).connect(dest);
    o.start(t); o.stop(t + 0.5); n.start(t); n.stop(t + 0.03);
  };
  V.snare = function (dest, t, vel = 1) {
    const c = A.ctx();
    const n = A.noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = 1200;
    g.gain.setValueAtTime(0.55 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(f).connect(g).connect(dest);
    const o = c.createOscillator(), og = c.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.1);
    og.gain.setValueAtTime(0.5 * vel, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(dest);
    n.start(t); n.stop(t + 0.25); o.start(t); o.stop(t + 0.15);
  };
  V.clap = function (dest, t, vel = 1) {
    const c = A.ctx(), n = A.noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 1.2;
    g.gain.setValueAtTime(0, t);
    [0, 0.011, 0.022].forEach((d) => { g.gain.setValueAtTime(0.7 * vel, t + d); g.gain.exponentialRampToValueAtTime(0.05, t + d + 0.009); });
    g.gain.setValueAtTime(0.5 * vel, t + 0.033);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(f).connect(g).connect(dest);
    n.start(t); n.stop(t + 0.25);
  };
  V.hat = function (dest, t, vel = 1, open) {
    const c = A.ctx(), n = A.noise(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = 7000;
    const len = open ? 0.28 : 0.045;
    g.gain.setValueAtTime(0.32 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(f).connect(g).connect(dest);
    n.start(t); n.stop(t + len + 0.02);
  };
  V.bass = function (dest, t, midi, dur, vel = 1) {
    const c = A.ctx(), o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o2.type = "sine";
    o.frequency.value = A.mtof(midi); o2.frequency.value = A.mtof(midi);
    f.type = "lowpass"; f.Q.value = 6;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * vel, t + 0.006);
    g.gain.setValueAtTime(0.42 * vel, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sg = c.createGain(); sg.gain.value = 0.5;
    o.connect(f).connect(g); o2.connect(sg).connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  };
  V.pad = function (dest, t, midis, dur, vel = 1) {
    const c = A.ctx(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "lowpass"; f.frequency.value = 1800; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.25);
    g.gain.setValueAtTime(0.09 * vel, t + dur - 0.15); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    f.connect(g).connect(dest);
    midis.forEach((m) => [-7, 7].forEach((det) => {
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = A.mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.3);
    }));
  };
  V.lead = function (dest, t, midi, dur, vel = 1) {
    const c = A.ctx(), o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "square"; o.frequency.value = A.mtof(midi);
    f.type = "lowpass"; f.Q.value = 3;
    f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.15, dur));
    o.connect(f).connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.1);
  };
  V.tone = function (dest, t, freq, dur, type = "sine", vol = 0.3) {
    const c = A.ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  };

  // ---------- Groove: loop de 4 compases en La menor (Am–F–C–G) ----------
  const BARS = [
    { root: 45, chord: [57, 60, 64], name: "Am" },
    { root: 41, chord: [53, 57, 60], name: "F" },
    { root: 48, chord: [55, 60, 64], name: "C" },
    { root: 43, chord: [55, 59, 62], name: "G" },
  ];
  A.BARS = BARS;
  const BASE = {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hat:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1],
    bass:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    lead:  [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,1,0],
  };
  A.TRACKS = ["kick", "snare", "clap", "hat", "bass", "pad", "lead"];

  class Groove {
    constructor(opts = {}) {
      const c = A.ctx();
      this.bpm = opts.bpm || 122;
      this.pattern = JSON.parse(JSON.stringify(opts.pattern || BASE));
      this.out = c.createGain();
      this.sum = c.createGain();
      this.hp = c.createBiquadFilter(); this.hp.type = "highpass"; this.hp.frequency.value = 10; this.hp.Q.value = 0.7;
      this.sum.connect(this.hp).connect(this.out);
      this.buses = {};
      this.duck = c.createGain(); // sidechain target (bass, pad, lead)
      this.duck.connect(this.sum);
      A.TRACKS.concat(["fx"]).forEach((n) => {
        const g = c.createGain();
        g.connect(["bass", "pad", "lead"].includes(n) ? this.duck : this.sum);
        this.buses[n] = g;
      });
      this.mutes = {};
      this.sidechain = 0; this.scRelease = 0.22;
      this.swing = 0;
      this.step = 0; this.playing = false;
      this.onStep = null;
      this.leadOn = opts.lead !== undefined ? opts.lead : false;
      if (!this.leadOn) this.mutes.lead = true;
    }
    connect(node) { this.out.connect(node); return node; }
    restore(name) {
      const bus = this.buses[name];
      bus.disconnect(); bus.connect(["bass", "pad", "lead"].includes(name) ? this.duck : this.sum);
    }
    // reroute a track bus through a custom chain: bus -> input ... output -> mix
    insert(name, input, output) {
      const bus = this.buses[name];
      bus.disconnect(); bus.connect(input);
      output.connect(["bass", "pad", "lead"].includes(name) ? this.duck : this.sum);
    }
    start() {
      const c = A.ctx();
      if (this.playing) return;
      this.playing = true; this.step = 0; this.barCount = 0;
      this.nextTime = c.currentTime + 0.06;
      this.timer = setInterval(() => this._tick(), 25);
      this._tick();
    }
    stop() {
      this.playing = false; clearInterval(this.timer);
      const c = A.ctx();
      this.duck.gain.cancelScheduledValues(c.currentTime); this.duck.gain.setValueAtTime(1, c.currentTime);
    }
    toggle() { this.playing ? this.stop() : this.start(); return this.playing; }
    dispose() { this.stop(); try { this.out.disconnect(); } catch (e) {} }
    get stepDur() { return 60 / this.bpm / 4; }
    _tick() {
      const c = A.ctx();
      while (this.nextTime < c.currentTime + 0.12) {
        const s = this.step, sd = this.stepDur;
        const t = this.nextTime + (s % 2 === 1 ? this.swing * sd * 0.5 : 0);
        this._schedule(s, t, sd);
        if (this.onStep) { const delay = Math.max(0, (t - c.currentTime) * 1000); setTimeout(() => this.playing && this.onStep(s, t), delay); }
        this.nextTime += sd;
        this.step = (this.step + 1) % 64;
      }
    }
    _schedule(s, t, sd) {
      const i = s % 16, bar = BARS[Math.floor(s / 16) % 4], B = this.buses;
      if (i === 0 && this.onBar) this.onBar(this.barCount++, t, sd * 16);
      const p = this.pattern, m = this.mutes;
      if (p.kick[i] && !m.kick) {
        V.kick(B.kick, t, p.kick[i] === 2 ? 0.7 : 1);
        if (this.sidechain > 0) {
          const g = this.duck.gain, depth = this.sidechain;
          g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
          g.linearRampToValueAtTime(1 - depth, t + 0.008);
          g.setTargetAtTime(1, t + 0.02, this.scRelease / 3);
        }
      }
      if (p.snare[i] && !m.snare) V.snare(B.snare, t);
      if (p.clap[i] && !m.clap) V.clap(B.clap, t);
      if (p.hat[i] && !m.hat) V.hat(B.hat, t, p.hat[i] === 2 ? 0.6 : 1, i === 14 && p.hat[15] === 0);
      if (p.bass[i] && !m.bass) V.bass(B.bass, t, bar.root, sd * 1.7);
      if (i === 0 && !m.pad) V.pad(B.pad, t, bar.chord, sd * 16);
      if (p.lead[i] && !m.lead) {
        const notes = bar.chord.concat([bar.chord[0] + 12]);
        V.lead(B.lead, t, notes[(i + Math.floor(s / 16)) % notes.length] + 12, sd * 1.5);
      }
    }
  }
  A.Groove = Groove;
  A.BASE_PATTERN = BASE;

  // ---------- Synth polifónico (lab de síntesis) ----------
  A.DEFAULT_PATCH = {
    name: "Init",
    osc1: { wave: "sawtooth", oct: 0, detune: 0, level: 0.6 },
    osc2: { wave: "sawtooth", oct: 0, detune: 7, level: 0.5 },
    noise: 0,
    filter: { type: "lowpass", cutoff: 1200, q: 4, env: 0.45 },
    fenv: { a: 0.01, d: 0.35, s: 0.2, r: 0.4 },
    aenv: { a: 0.01, d: 0.3, s: 0.7, r: 0.4 },
    lfo: { rate: 5, depth: 0, target: "pitch", wave: "sine" },
    glide: 0,
  };

  class Synth {
    constructor(patch) {
      const c = A.ctx();
      this.patch = JSON.parse(JSON.stringify(patch || A.DEFAULT_PATCH));
      this.out = c.createGain(); this.out.gain.value = 0.5;
      this.trem = c.createGain(); this.trem.connect(this.out);
      this.lfo = c.createOscillator(); this.lfo.start();
      this.lfoPitch = c.createGain(); this.lfoFilter = c.createGain(); this.lfoAmp = c.createGain();
      this.lfo.connect(this.lfoPitch); this.lfo.connect(this.lfoFilter); this.lfo.connect(this.lfoAmp);
      this.lfoAmp.connect(this.trem.gain);
      this.voices = new Map();
      this.applyLfo();
    }
    applyLfo() {
      const l = this.patch.lfo, c = A.ctx(), t = c.currentTime;
      this.lfo.type = l.wave || "sine";
      this.lfo.frequency.setTargetAtTime(l.rate, t, 0.02);
      this.lfoPitch.gain.setTargetAtTime(l.target === "pitch" ? l.depth * 100 : 0, t, 0.02);   // cents
      this.lfoFilter.gain.setTargetAtTime(l.target === "filter" ? l.depth * 2400 : 0, t, 0.02); // cents
      this.lfoAmp.gain.setTargetAtTime(l.target === "amp" ? l.depth * 0.5 : 0, t, 0.02);
      this.trem.gain.setTargetAtTime(l.target === "amp" ? 1 - l.depth * 0.5 : 1, t, 0.02);
    }
    set(path, value) {
      const parts = path.split("."); let o = this.patch;
      while (parts.length > 1) o = o[parts.shift()];
      o[parts[0]] = value;
      if (path.startsWith("lfo")) this.applyLfo();
      // live-update sounding voices for continuous params
      const c = A.ctx(), t = c.currentTime;
      this.voices.forEach((v) => {
        if (path === "filter.q") v.f.Q.setTargetAtTime(value, t, 0.02);
        if (path === "filter.type") v.f.type = value;
        if (path === "osc1.detune" || path === "osc2.detune" || path.endsWith(".oct")) {
          v.o1.detune.setTargetAtTime(this.patch.osc1.oct * 1200 + this.patch.osc1.detune, t, 0.02);
          v.o2.detune.setTargetAtTime(this.patch.osc2.oct * 1200 + this.patch.osc2.detune, t, 0.02);
        }
        if (path === "osc1.level") v.g1.gain.setTargetAtTime(value, t, 0.02);
        if (path === "osc2.level") v.g2.gain.setTargetAtTime(value, t, 0.02);
        if (path === "osc1.wave") v.o1.type = value;
        if (path === "osc2.wave") v.o2.type = value;
        if (path === "noise" && v.gn) v.gn.gain.setTargetAtTime(value, t, 0.02);
        if (path === "filter.cutoff") v.f.frequency.setTargetAtTime(Math.max(20, value * Math.pow(2, this.patch.filter.env * 6 * this.patch.fenv.s)), t, 0.03);
      });
    }
    noteOn(midi, vel = 0.9, when) {
      const c = A.ctx(), t = when || c.currentTime, p = this.patch;
      if (this.voices.has(midi)) this.noteOff(midi, t);
      const f0 = A.mtof(midi);
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = p.osc1.wave; o2.type = p.osc2.wave;
      o1.frequency.value = f0; o2.frequency.value = f0;
      o1.detune.value = p.osc1.oct * 1200 + p.osc1.detune;
      o2.detune.value = p.osc2.oct * 1200 + p.osc2.detune;
      this.lfoPitch.connect(o1.detune); this.lfoPitch.connect(o2.detune);
      const g1 = c.createGain(), g2 = c.createGain();
      g1.gain.value = p.osc1.level; g2.gain.value = p.osc2.level;
      const f = c.createBiquadFilter(); f.type = p.filter.type; f.Q.value = p.filter.q;
      this.lfoFilter.connect(f.detune);
      const a = c.createGain(); a.gain.value = 0;
      o1.connect(g1).connect(f); o2.connect(g2).connect(f);
      let n = null, gn = c.createGain();
      gn.gain.value = p.noise;
      n = A.noise(null, true); n.connect(gn).connect(f); n.start(t);
      f.connect(a).connect(this.trem);
      // filter envelope
      const fe = p.fenv, base = Math.max(20, p.filter.cutoff), amt = p.filter.env * 6;
      const peak = Math.min(19000, base * Math.pow(2, amt));
      const sus = Math.min(19000, base * Math.pow(2, amt * fe.s));
      f.frequency.setValueAtTime(base, t);
      f.frequency.linearRampToValueAtTime(peak, t + Math.max(0.003, fe.a));
      f.frequency.setTargetAtTime(sus, t + Math.max(0.003, fe.a), Math.max(0.005, fe.d / 4));
      // amp envelope
      const ae = p.aenv, pk = 0.32 * vel;
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(pk, t + Math.max(0.003, ae.a));
      a.gain.setTargetAtTime(pk * ae.s, t + Math.max(0.003, ae.a), Math.max(0.005, ae.d / 4));
      o1.start(t); o2.start(t);
      const v = { o1, o2, g1, g2, f, a, n, gn, start: t };
      this.voices.set(midi, v);
      return v;
    }
    noteOff(midi, when) {
      const v = this.voices.get(midi); if (!v) return;
      this.voices.delete(midi);
      const c = A.ctx(), t = Math.max(when || c.currentTime, c.currentTime), r = Math.max(0.01, this.patch.aenv.r), fr = Math.max(0.01, this.patch.fenv.r);
      [v.a.gain, v.f.frequency].forEach((prm) => {
        if (prm.cancelAndHoldAtTime) prm.cancelAndHoldAtTime(t);
        else { prm.cancelScheduledValues(t); prm.setValueAtTime(prm.value, t); }
      });
      v.a.gain.setTargetAtTime(0, t, r / 4);
      v.f.frequency.setTargetAtTime(Math.max(20, this.patch.filter.cutoff), t, fr / 4);
      const end = t + r * 1.4 + 0.05;
      [v.o1, v.o2, v.n].forEach((o) => o && o.stop(end));
      setTimeout(() => { try { this.lfoPitch.disconnect(v.o1.detune); this.lfoPitch.disconnect(v.o2.detune); this.lfoFilter.disconnect(v.f.detune); } catch (e) {} }, (end - c.currentTime) * 1000 + 50);
    }
    play(midi, dur = 0.6, when) {
      const c = A.ctx(), t = when || c.currentTime;
      this.noteOn(midi, 0.9, t);
      setTimeout(() => this.noteOff(midi), (t - c.currentTime + dur) * 1000);
    }
    allOff() { [...this.voices.keys()].forEach((m) => this.noteOff(m)); }
    dispose() { this.allOff(); setTimeout(() => { try { this.out.disconnect(); this.lfo.stop(); } catch (e) {} }, 3000); }
  }
  A.Synth = Synth;

  // ---------- active-sound registry so route changes silence everything ----------
  const live = new Set();
  A.track = (o) => { live.add(o); return o; };
  A.stopAll = () => { live.forEach((o) => { try { o.dispose ? o.dispose() : o.stop(); } catch (e) {} }); live.clear(); };
})(window.S);
