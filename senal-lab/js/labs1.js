/* Señal Lab — Labs: Beat, Mezcla 3D, Arreglo */
window.S = window.S || {};
(function (S) {
  const L = (S.labs = S.labs || {});
  const { el } = S.ui, U = S.ui, A = S.audio, V = S.viz;

  const TC = { kick: "--b-sub", snare: "--b-mid", clap: "--b-himid", hat: "--b-air", bass: "--b-low", pad: "--b-lowmid", lead: "--b-pres", fx: "--hot" };
  const TN = { kick: "Bombo", snare: "Caja", clap: "Clap", hat: "Hi-hat", bass: "Bajo", pad: "Pad", lead: "Lead", fx: "FX / Riser" };
  L.TC = TC; L.TN = TN;
  const P = (s) => s.split("").map((c) => (c === "x" ? 1 : c === "o" ? 2 : 0));
  const Z = "................";

  // Géneros y BPM: tabla de Swindali, *Electronic Dance Music Production* ("The Main Genres of EDM").
  // Los patrones son arquetipos de cada estilo para escuchar la diferencia.
  L.GENRES = [
    { id: "house", name: "Big Room / House", bpm: 128, range: "126–130", p: { kick: "x...x...x...x...", snare: Z, clap: "....x.......x...", hat: "..x...x...x...x.", bass: "..x...x...x...x.", lead: "x..x..x..x..x.x." } },
    { id: "electro", name: "Electro House", bpm: 128, range: "126–130", p: { kick: "x...x...x...x...", snare: Z, clap: "....x.......x...", hat: "x.x.x.x.x.x.x.xx", bass: "x..x..x...x..x..", lead: "x.x..x.x..x.x..." } },
    { id: "dubstep", name: "Dubstep", bpm: 140, range: "140–155", p: { kick: "x.........x.....", snare: "........x.......", clap: Z, hat: "x.x.x.x.x.x.x.x.", bass: "x...x.......x.x.", lead: "x.......x...x..." } },
    { id: "trap", name: "Trap", bpm: 140, range: "140–160", p: { kick: "x......x..x.....", snare: Z, clap: "........x.......", hat: "xxxxxxxxxxxxxxxx", bass: "x......x..x.....", lead: "x...x...x..x...." } },
    { id: "future", name: "Future Bass", bpm: 150, range: "145–160", p: { kick: "x.....x...x.....", snare: "........x.......", clap: "........x.......", hat: "..x...x...x...x.", bass: "x.....x...x.....", lead: "x.x.x...x.x.x..." } },
    { id: "psy", name: "Psytrance", bpm: 142, range: "135–150", p: { kick: "x...x...x...x...", snare: Z, clap: "....x.......x...", hat: "..x...x...x...x.", bass: ".xxx.xxx.xxx.xxx", lead: "x..x..x..x..x..." } },
    { id: "hardstyle", name: "Hardstyle", bpm: 155, range: "150–160", p: { kick: "x...x...x...x...", snare: Z, clap: "....x.......x...", hat: "..x...x...x...x.", bass: Z, lead: "x..x..x.x..x..x." } },
    { id: "dnb", name: "Drum & Bass", bpm: 174, range: "160–180", p: { kick: "x.........x.....", snare: "....x.......x...", clap: Z, hat: "x.x.x.x.x.x.x.x.", bass: "x.....x...x.....", lead: "x...x...x.x....." } },
  ];
  L.patternFrom = (g) => { const o = {}; for (const k in g.p) o[k] = P(g.p[k]); return o; };

  // ---------- SuperCollider export of a step pattern ----------
  L.scPattern = function (pattern, bpm, mutes) {
    const roots = A.BARS.map((b) => b.root);
    const seq = (arr, amp) => "Pseq([" + arr.map((v) => (v ? amp : "Rest()")).join(", ") + "], inf)";
    const bassNotes = [];
    for (let bar = 0; bar < 4; bar++) for (let i = 0; i < 16; i++) bassNotes.push(pattern.bass[i] ? roots[bar] : "Rest()");
    const on = (k) => !mutes[k] && pattern[k] && pattern[k].some((v) => v);
    let s = "";
    s += "// Señal Lab: patrón exportado a SuperCollider\n";
    s += "// 1) Evaluá el primer bloque (Cmd/Ctrl+Enter) 2) Evaluá el segundo para tocar\n(\n";
    s += "TempoClock.default.tempo = " + bpm + " / 60;\n\n";
    s += "SynthDef(\\kick, { |out = 0, amp = 0.9|\n  var env = EnvGen.ar(Env.perc(0.004, 0.45), doneAction: 2);\n  var freq = EnvGen.ar(Env([160, 48, 40], [0.11, 0.3], \\exp));\n  Out.ar(out, (SinOsc.ar(freq) * env * amp) ! 2);\n}).add;\n\n";
    s += "SynthDef(\\snare, { |out = 0, amp = 0.6|\n  var noise = HPF.ar(WhiteNoise.ar, 1200) * EnvGen.ar(Env.perc(0.001, 0.2), doneAction: 2);\n  var body = LFTri.ar(XLine.ar(220, 160, 0.1)) * EnvGen.ar(Env.perc(0.001, 0.12));\n  Out.ar(out, ((noise + body) * amp) ! 2);\n}).add;\n\n";
    s += "SynthDef(\\clap, { |out = 0, amp = 0.6|\n  var env = EnvGen.ar(Env([0, 1, 0.1, 1, 0.1, 1, 0], [0.001, 0.01, 0.001, 0.01, 0.001, 0.18], -4), doneAction: 2);\n  Out.ar(out, (BPF.ar(WhiteNoise.ar, 1400, 0.8) * env * amp) ! 2);\n}).add;\n\n";
    s += "SynthDef(\\hat, { |out = 0, amp = 0.3|\n  var sig = HPF.ar(WhiteNoise.ar, 7000) * EnvGen.ar(Env.perc(0.001, 0.045), doneAction: 2);\n  Out.ar(out, (sig * amp) ! 2);\n}).add;\n\n";
    s += "SynthDef(\\bass, { |out = 0, freq = 55, amp = 0.4, sustain = 0.2|\n  var env = EnvGen.ar(Env.linen(0.005, sustain, 0.05), doneAction: 2);\n  var sig = RLPF.ar(Saw.ar(freq), XLine.ar(900, 220, 0.18), 0.17) + (SinOsc.ar(freq) * 0.5);\n  Out.ar(out, (sig * env * amp) ! 2);\n}).add;\n)\n\n(\n";
    if (on("kick")) s += "Pdef(\\k, Pbind(\\instrument, \\kick, \\dur, 1/4, \\amp, " + seq(pattern.kick, 0.9) + ")).play(quant: 4);\n";
    if (on("snare")) s += "Pdef(\\s, Pbind(\\instrument, \\snare, \\dur, 1/4, \\amp, " + seq(pattern.snare, 0.6) + ")).play(quant: 4);\n";
    if (on("clap")) s += "Pdef(\\c, Pbind(\\instrument, \\clap, \\dur, 1/4, \\amp, " + seq(pattern.clap, 0.6) + ")).play(quant: 4);\n";
    if (on("hat")) s += "Pdef(\\h, Pbind(\\instrument, \\hat, \\dur, 1/4, \\amp, " + seq(pattern.hat, 0.3) + ")).play(quant: 4);\n";
    if (on("bass")) s += "// Bajo: tónicas de Am – F – C – G, un compás cada una\nPdef(\\b, Pbind(\\instrument, \\bass, \\dur, 1/4, \\legato, 1.7,\n  \\midinote, Pseq([" + bassNotes.join(", ") + "], inf))).play(quant: 4);\n";
    s += ")\n\n// Para frenar: Pdef.all.do(_.stop);";
    return s;
  };
  L.hl = function (code) {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>')
      .replace(/(\\[a-zA-Z]+)/g, '<span class="s">$1</span>')
      .replace(/\b(SynthDef|Pbind|Pdef|Pseq|EnvGen|Env|SinOsc|Saw|Pulse|LFTri|WhiteNoise|HPF|RLPF|RHPF|BPF|XLine|Out|Rest|TempoClock|Mix|Pan2|Lag|LFNoise2)\b/g, '<span class="k">$1</span>')
      .replace(/(?<![\w.])(\d+\.?\d*)(?![\w])/g, '<span class="n">$1</span>');
  };
  L.codePanel = function (title, getCode) {
    const pre = el("pre", { class: "code" });
    const refresh = () => (pre.innerHTML = L.hl(getCode()));
    const copy = el("button", { type: "button", class: "btn sm", onclick: () => U.copy(getCode()) }, "Copiar");
    const det = el("details", { class: "deep" }, el("summary", null, title), el("div", null, el("div", { class: "btn-row", style: { marginBottom: "10px" } }, copy, el("span", { class: "eyebrow" }, "Probalo en el IDE de SuperCollider")), pre));
    det.addEventListener("toggle", refresh);
    det.refresh = () => det.open && refresh();
    return det;
  };

  // =====================================================================
  // LAB: BEAT — secuenciador por pasos, géneros, swing y sidechain
  // =====================================================================
  L.beat = {
    title: "Caja de ritmos", tag: "Ritmo · Groove", color: "--b-sub",
    desc: "Secuenciador de 16 pasos con los BPM de cada género, swing y sidechain visible.",
    render(root) {
      const g = A.track(new A.Groove({ bpm: 128, lead: false }));
      const an = V.mkAnalyser(2048, 0.8);
      g.connect(an).connect(A.master);
      let genre = L.GENRES[0];
      g.pattern = L.patternFrom(genre);
      g.mutes = { lead: true };
      const rows = ["kick", "snare", "clap", "hat", "bass", "lead"];
      const cells = {};
      let nowStep = -1;

      const seq = el("div", { class: "seq" });
      rows.forEach((r) => {
        const row = el("div", { class: "seq-row" });
        const muteBtn = el("button", { type: "button", class: "name", style: { background: "none", border: 0, textAlign: "left", cursor: "pointer", padding: 0 }, title: "Silenciar / activar" }, TN[r]);
        muteBtn.addEventListener("click", () => { g.mutes[r] = !g.mutes[r]; muteBtn.style.opacity = g.mutes[r] ? 0.35 : 1; muteBtn.style.textDecoration = g.mutes[r] ? "line-through" : "none"; sc.refresh(); });
        if (g.mutes[r]) { muteBtn.style.opacity = 0.35; muteBtn.style.textDecoration = "line-through"; }
        row.append(muteBtn);
        cells[r] = [];
        for (let i = 0; i < 16; i++) {
          const c = el("button", { type: "button", class: "cell" + (i % 4 === 0 ? " beat" : ""), "aria-label": TN[r] + " paso " + (i + 1), style: { "--rc": V.css(TC[r]) } });
          c.addEventListener("click", () => { g.pattern[r][i] = g.pattern[r][i] ? 0 : 1; paint(); sc.refresh(); });
          cells[r].push(c); row.append(c);
        }
        seq.append(row);
      });
      const paint = () => rows.forEach((r) => cells[r].forEach((c, i) => { c.classList.toggle("on", !!g.pattern[r][i]); c.classList.toggle("now", i === nowStep); c.style.setProperty("--rc", V.css(TC[r])); }));
      paint();
      g.onStep = (s) => { nowStep = s % 16; paint(); };

      const genreSeg = el("div", { class: "btn-row" });
      const gBtns = L.GENRES.map((gn) => {
        const b = el("button", { type: "button", class: "btn sm" + (gn === genre ? " on" : "") }, gn.name + " · " + gn.bpm);
        b.addEventListener("click", () => {
          genre = gn; g.pattern = L.patternFrom(gn); g.bpm = gn.bpm; bpm.set(gn.bpm, true);
          gBtns.forEach((x) => x.classList.toggle("on", x === b)); info.textContent = "Rango típico según Swindali: " + gn.range + " BPM"; paint(); sc.refresh();
        });
        return b;
      });
      genreSeg.append(...gBtns);
      const info = el("p", { class: "eyebrow", style: { margin: 0 } }, "Rango típico según Swindali: " + genre.range + " BPM");

      const bpm = U.slider({ label: "Tempo", min: 60, max: 180, step: 1, value: 128, unit: " BPM", onInput: (v) => { g.bpm = v; sc.refresh(); } });
      const swing = U.slider({ label: "Swing", min: 0, max: 0.6, step: 0.01, value: 0, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => (g.swing = v) });
      const scDepth = U.slider({ label: "Sidechain profundidad", min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => (g.sidechain = v) });
      const scRel = U.slider({ label: "Sidechain release", min: 0.05, max: 0.6, step: 0.01, value: 0.22, unit: " s", onInput: (v) => (g.scRelease = v) });
      const padT = el("button", { type: "button", class: "btn sm on" }, "Pad (acordes)");
      padT.addEventListener("click", () => { g.mutes.pad = !g.mutes.pad; padT.classList.toggle("on", !g.mutes.pad); });
      const leadT = el("button", { type: "button", class: "btn sm" }, "Lead (arpegio)");
      leadT.addEventListener("click", () => { g.mutes.lead = !g.mutes.lead; leadT.classList.toggle("on", !g.mutes.lead); sc.refresh(); });
      const clear = el("button", { type: "button", class: "btn sm" }, "Vaciar patrón");
      clear.addEventListener("click", () => { rows.forEach((r) => (g.pattern[r] = new Array(16).fill(0))); paint(); sc.refresh(); });
      const play = U.playBtn("Tocar", (on) => { on ? g.start() : (g.stop(), (nowStep = -1), paint()); });

      // spectrum + sidechain curve
      const spec = V.canvas(150), scCv = V.canvas(150);
      V.loop(() => {
        let { g: c, w, h } = V.fit(spec, 150);
        c.fillStyle = V.css("--screen"); c.fillRect(0, 0, w, h);
        V.freqGrid(c, w, h, { bands: true });
        V.drawSpectrum(c, w, h, an, { fill: true });
        ({ g: c, w, h } = V.fit(scCv, 150));
        c.fillStyle = V.css("--screen"); c.fillRect(0, 0, w, h);
        const stepW = w / 16, pad = 18, H = h - pad * 2;
        for (let i = 0; i < 16; i++) {
          c.fillStyle = V.css("--screen-grid"); c.fillRect(i * stepW, 0, 1, h);
          if (g.pattern.kick[i]) { c.fillStyle = V.css("--b-sub"); c.fillRect(i * stepW + 2, h - 8, stepW - 4, 6); }
          if (g.pattern.bass[i]) { c.fillStyle = V.css("--b-low"); c.globalAlpha = 0.35; c.fillRect(i * stepW + 2, pad, stepW * 1.7 - 4, H); c.globalAlpha = 1; }
        }
        // gain curve of the duck
        c.beginPath();
        const depth = g.sidechain, tau = g.scRelease / 3, sd = 60 / g.bpm / 4;
        for (let x = 0; x <= w; x += 2) {
          const tt = (x / w) * 16 * sd; let last = null;
          // most recent kick at or before tt, looking back into the previous bar too
          for (let k = 0; k < 16; k++) if (g.pattern.kick[k]) [k * sd, (k - 16) * sd].forEach((ts) => { if (ts <= tt && (last === null || ts > last)) last = ts; });
          const gain = depth > 0 && last !== null ? 1 - depth * Math.exp(-Math.max(0, tt - last - 0.02) / tau) : 1;
          const y = pad + (1 - gain) * H;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.strokeStyle = V.css("--screen-ink"); c.lineWidth = 2; c.stroke();
        if (nowStep >= 0 && g.playing) { c.fillStyle = V.css("--accent"); c.fillRect(nowStep * stepW, 0, 2, h); }
        c.fillStyle = V.css("--screen-ink"); c.font = "10px " + V.css("--f-mono"); c.globalAlpha = 0.7;
        c.fillText("VOLUMEN DE BAJO + PAD (1 COMPÁS)", 8, 12); c.globalAlpha = 1;
      });

      const sc = L.codePanel("Ver este patrón en SuperCollider", () => L.scPattern(g.pattern, Math.round(g.bpm), g.mutes));

      root.append(
        el("div", { class: "lab-grid" },
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Secuenciador · 16 pasos = 1 compás"), el("div", { class: "btn-row" }, play)),
              el("div", { class: "body" }, genreSeg, info, seq, el("div", { class: "btn-row" }, padT, leadT, clear)),
              el("p", { class: "cap" }, "Tocá una celda para encender o apagar un golpe. Las columnas resaltadas son los tiempos fuertes (negras). Tocá el nombre de una pista para silenciarla.")
            ),
            sc
          ),
          el("div", { class: "stack" },
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Espectro en vivo")), el("div", { class: "body" }, el("div", { class: "screen" }, spec))),
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, "Sidechain: el bajo \"se agacha\" con cada bombo")),
              el("div", { class: "body" }, el("div", { class: "screen" }, scCv), el("div", { class: "controls" }, scDepth, scRel)),
              el("p", { class: "cap" }, "Subí la profundidad y escuchá el \"bombeo\". Es el truco que Swindali describe como el uso más común del sidechain en EDM.")
            ),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Tempo y groove")), el("div", { class: "body controls" }, bpm, swing))
          )
        )
      );
    },
  };

  // =====================================================================
  // LAB: MEZCLA 3D — escenario estéreo (paneo x profundidad) + canales
  // =====================================================================
  L.mix = {
    title: "Mezcla en 3D", tag: "Balance · Paneo · Profundidad", color: "--b-lowmid",
    desc: "Arrastrá cada instrumento en un escenario: izquierda/derecha y adelante/atrás.",
    render(root) {
      const c = A.ctx();
      const g = A.track(new A.Groove({ bpm: 122, lead: true }));
      g.pattern = L.patternFrom(L.GENRES[0]);
      g.pattern.snare = g.pattern.clap; g.pattern.clap = new Array(16).fill(0);
      g.mutes = {};
      const names = ["kick", "snare", "hat", "bass", "pad", "lead"];
      const out = c.createGain(), revIn = c.createGain(), conv = c.createConvolver(), revRet = c.createGain();
      conv.buffer = A.impulse(2.4, 3); revRet.gain.value = 0.9;
      revIn.connect(conv).connect(revRet).connect(out);
      // mono check
      const monoSplit = c.createChannelSplitter(2), monoMerge = c.createChannelMerger(2), monoSum = c.createGain(); monoSum.gain.value = 0.5;
      const master = c.createGain(), an = V.mkAnalyser(2048, 0.6);
      g.out.connect(out);
      g.out.gain.value = 0.42; // a real mix leaves headroom: start around -8 dBFS
      let mono = false;
      const route = () => {
        out.disconnect();
        if (mono) { out.connect(monoSplit); monoSplit.connect(monoSum, 0); monoSplit.connect(monoSum, 1); monoSum.connect(monoMerge, 0, 0); monoSum.connect(monoMerge, 0, 1); monoMerge.connect(master); }
        else out.connect(master);
      };
      route(); master.connect(an).connect(A.master);

      const RANGES = { kick: [[35, 140], [1800, 4000]], snare: [[150, 300], [1500, 8000]], hat: [[6000, 16000]], bass: [[40, 300]], pad: [[200, 4000]], lead: [[400, 6000]] };
      const DEF = { kick: { vol: 0, pan: 0, depth: 0 }, snare: { vol: -3, pan: 0, depth: 0.15 }, hat: { vol: -9, pan: 0.35, depth: 0.3 }, bass: { vol: -2, pan: 0, depth: 0.05 }, pad: { vol: -8, pan: -0.15, depth: 0.65 }, lead: { vol: -7, pan: -0.3, depth: 0.25 } };
      const BAD = { kick: { vol: 0, pan: 0, depth: 0 }, snare: { vol: 0, pan: 0, depth: 0 }, hat: { vol: 0, pan: 0, depth: 0 }, bass: { vol: 0, pan: 0, depth: 0 }, pad: { vol: 0, pan: 0, depth: 0 }, lead: { vol: 0, pan: 0, depth: 0 } };
      const T = {};
      names.forEach((n) => {
        const fader = c.createGain(), lp = c.createBiquadFilter(), pan = c.createStereoPanner(), send = c.createGain(), mtr = V.mkAnalyser(1024, 0.5);
        lp.type = "lowpass"; lp.Q.value = 0.5;
        fader.connect(lp).connect(pan); pan.connect(send).connect(revIn); pan.connect(mtr);
        g.insert(n, fader, pan);
        T[n] = { fader, lp, pan, send, mtr, st: Object.assign({}, DEF[n]), mute: false, solo: false, ui: {} };
      });
      const apply = (n) => {
        const t = T[n], s = t.st, now = c.currentTime;
        const anySolo = names.some((k) => T[k].solo);
        const audible = !t.mute && (!anySolo || t.solo);
        t.fader.gain.setTargetAtTime(audible ? A.dbToGain(s.vol) : 0, now, 0.02);
        t.pan.pan.setTargetAtTime(s.pan, now, 0.02);
        t.send.gain.setTargetAtTime(0.03 + s.depth * 0.7, now, 0.03);
        t.lp.frequency.setTargetAtTime(19000 * Math.pow(1 - s.depth * 0.85, 2) + 600, now, 0.03);
      };
      names.forEach(apply);

      // ----- stage canvas -----
      const stageCv = V.canvas(340); stageCv.setAttribute("role", "img"); stageCv.setAttribute("aria-label", "Escenario de mezcla: paneo y profundidad de cada instrumento");
      const stage = el("div", { class: "stage screen" }, stageCv);
      const geom = (w, h) => ({ top: 44, bot: h - 58, wTop: w * 0.42, wBot: w * 0.92 });
      const posOf = (s, w, h) => { const G = geom(w, h); const y = G.bot - s.depth * (G.bot - G.top); const ww = G.wBot + (G.wTop - G.wBot) * s.depth; return { x: w / 2 + s.pan * ww / 2, y }; };
      let drag = null;
      const hit = (x, y) => { const w = stageCv.clientWidth, h = 340; let best = null, bd = 1e9; names.forEach((n) => { const p = posOf(T[n].st, w, h); const d = Math.hypot(p.x - x, p.y - y); if (d < 34 && d < bd) { bd = d; best = n; } }); return best; };
      const moveTo = (n, x, y) => {
        const w = stageCv.clientWidth, h = 340, G = geom(w, h);
        const depth = Math.max(0, Math.min(1, (G.bot - y) / (G.bot - G.top)));
        const ww = G.wBot + (G.wTop - G.wBot) * depth;
        const pan = Math.max(-1, Math.min(1, (x - w / 2) / (ww / 2)));
        T[n].st.pan = +pan.toFixed(2); T[n].st.depth = +depth.toFixed(2); apply(n);
        T[n].ui.pan.set(T[n].st.pan, true); T[n].ui.depth.set(T[n].st.depth, true);
      };
      const pt = (e) => { const r = stageCv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      stageCv.addEventListener("pointerdown", (e) => { const [x, y] = pt(e); drag = hit(x, y); if (drag) { stageCv.setPointerCapture(e.pointerId); e.preventDefault(); } });
      stageCv.addEventListener("pointermove", (e) => { if (!drag) { const [x, y] = pt(e); stageCv.style.cursor = hit(x, y) ? "grab" : "default"; return; } const [x, y] = pt(e); moveTo(drag, x, y); });
      stageCv.addEventListener("pointerup", () => (drag = null));
      stageCv.addEventListener("pointercancel", () => (drag = null));

      const freqCv = V.canvas(200);
      const meterBar = el("i", { style: { height: "0%" } });
      const peakRead = el("span", { class: "big-read" }, "–∞");
      const peakNote = el("p", { class: "eyebrow", style: { margin: 0 } }, "Pico del master (dBFS)");
      let peakHold = -99, holdT = 0;

      V.loop((ts) => {
        let { g: x, w, h } = V.fit(stageCv, 340);
        const G = geom(w, h);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        // floor grid in perspective
        x.strokeStyle = V.css("--screen-grid"); x.lineWidth = 1;
        for (let i = 0; i <= 6; i++) { const d = i / 6, y = G.bot - d * (G.bot - G.top), ww = G.wBot + (G.wTop - G.wBot) * d; x.beginPath(); x.moveTo(w / 2 - ww / 2, y); x.lineTo(w / 2 + ww / 2, y); x.stroke(); }
        for (let i = -4; i <= 4; i++) { const p = i / 4; x.beginPath(); x.moveTo(w / 2 + p * G.wBot / 2, G.bot); x.lineTo(w / 2 + p * G.wTop / 2, G.top); x.stroke(); }
        x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.6; x.font = "10px " + V.css("--f-mono");
        x.fillText("FONDO · más reverb, menos agudos", 10, 16); x.fillText("FRENTE · seco y presente", 10, h - 10);
        x.textAlign = "right"; x.fillText("L ◀   ▶ R", w - 10, h - 10); x.textAlign = "left"; x.globalAlpha = 1;
        // listener
        x.fillStyle = V.css("--screen-ink"); x.beginPath(); x.arc(w / 2, h - 4, 5, 0, 7); x.fill();
        // instruments (back to front)
        names.slice().sort((a, b) => T[b].st.depth - T[a].st.depth).forEach((n) => {
          const t = T[n], p = posOf(t.st, w, h);
          const { rms } = V.rms(t.mtr);
          const lvl = Math.min(1, rms * 4);
          const r = (14 + Math.max(0, (t.st.vol + 30) / 36) * 16) * (1 - t.st.depth * 0.35);
          const col = V.css(TC[n]);
          const silent = t.mute || (names.some((k) => T[k].solo) && !t.solo);
          x.globalAlpha = silent ? 0.2 : 0.22 + lvl * 0.5; x.fillStyle = col;
          x.beginPath(); x.arc(p.x, p.y, r + 6 + lvl * 16, 0, 7); x.fill();
          x.globalAlpha = silent ? 0.35 : 1; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fill();
          x.fillStyle = "#fff"; x.font = "600 11px " + V.css("--f-mono"); x.textAlign = "center";
          x.fillText(TN[n].toUpperCase(), p.x, p.y + 4); x.textAlign = "left"; x.globalAlpha = 1;
        });
        // frequency "height" map
        ({ g: x, w, h } = V.fit(freqCv, 200));
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        V.freqGrid(x, w, h, { bands: true });
        const rowH = (h - 26) / names.length;
        names.forEach((n, i) => {
          const y = 8 + i * rowH;
          x.fillStyle = V.css(TC[n]);
          RANGES[n].forEach(([a, b], k) => { x.globalAlpha = k ? 0.45 : 0.85; x.fillRect(V.fx(a, w), y + 3, V.fx(b, w) - V.fx(a, w), rowH - 8); });
          x.globalAlpha = 1; x.fillStyle = V.css("--screen-ink"); x.font = "10px " + V.css("--f-mono"); x.fillText(TN[n], 4, y + rowH / 2 + 2);
        });
        x.strokeStyle = V.css("--hot"); x.setLineDash([4, 4]); const x200 = V.fx(200, w); x.beginPath(); x.moveTo(x200, 0); x.lineTo(x200, h - 16); x.stroke(); x.setLineDash([]);
        x.fillStyle = V.css("--hot"); x.fillText("200 Hz: debajo, en mono", x200 + 4, 12);
        // master meter
        const { peak } = V.rms(an); const db = A.gainToDb(peak);
        if (db > peakHold || ts - holdT > 1500) { peakHold = db; holdT = ts; }
        meterBar.style.height = Math.max(0, Math.min(100, ((db + 48) / 48) * 100)) + "%";
        peakRead.textContent = peakHold < -90 ? "–∞" : peakHold.toFixed(1);
        peakRead.style.color = peakHold > -6 ? V.css("--warn") : V.css("--ink");
        peakNote.textContent = peakHold > -6 ? "Pasaste los −6 dB: dejá margen (headroom) para el mastering" : "Pico del master (dBFS) · objetivo ≤ −6 dB";
      });

      // ----- channel strips -----
      const strips = el("div", { class: "controls", style: { gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" } });
      names.forEach((n) => {
        const t = T[n];
        const mBtn = el("button", { type: "button", class: "btn sm" }, "M"), sBtn = el("button", { type: "button", class: "btn sm" }, "S");
        mBtn.addEventListener("click", () => { t.mute = !t.mute; mBtn.classList.toggle("on", t.mute); names.forEach(apply); });
        sBtn.addEventListener("click", () => { t.solo = !t.solo; sBtn.classList.toggle("on", t.solo); names.forEach(apply); });
        t.ui.vol = U.slider({ label: "Volumen", min: -30, max: 6, step: 0.5, value: t.st.vol, unit: " dB", onInput: (v) => { t.st.vol = v; apply(n); } });
        t.ui.pan = U.slider({ label: "Paneo", min: -1, max: 1, step: 0.01, value: t.st.pan, fmt: (v) => (Math.abs(v) < 0.02 ? "C" : (v < 0 ? "L" : "R") + Math.round(Math.abs(v) * 100)), onInput: (v) => { t.st.pan = v; apply(n); } });
        t.ui.depth = U.slider({ label: "Profundidad", min: 0, max: 1, step: 0.01, value: t.st.depth, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => { t.st.depth = v; apply(n); } });
        strips.append(el("div", { class: "group", style: { "--gc": V.css(TC[n]) } }, el("div", { class: "gt" }, el("i"), TN[n], el("span", { style: { marginLeft: "auto", display: "flex", gap: "4px" } }, mBtn, sBtn)), t.ui.vol, t.ui.pan, t.ui.depth));
      });
      const setAll = (preset) => names.forEach((n) => { T[n].st = Object.assign({}, preset[n]); T[n].ui.vol.set(T[n].st.vol, true); T[n].ui.pan.set(T[n].st.pan, true); T[n].ui.depth.set(T[n].st.depth, true); apply(n); });
      const monoBtn = el("button", { type: "button", class: "btn sm" }, "Chequeo mono");
      monoBtn.addEventListener("click", () => { mono = !mono; monoBtn.classList.toggle("on", mono); route(); });
      const play = U.playBtn("Tocar mezcla", (on) => { on ? g.start() : g.stop(); });

      root.append(
        el("div", { class: "lab-grid" },
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Escenario · ancho × profundidad"), el("div", { class: "btn-row" }, play)),
              el("div", { class: "body" }, stage,
                el("div", { class: "btn-row" },
                  el("button", { type: "button", class: "btn sm", onclick: () => setAll(BAD) }, "Todo al centro y adelante"),
                  el("button", { type: "button", class: "btn sm", onclick: () => setAll(DEF) }, "Mezcla en 3D"),
                  monoBtn)),
              el("p", { class: "cap" }, "Arrastrá los círculos. Hacia atrás suma reverb y quita agudos: así funciona la profundidad, no solo bajando el volumen. Probá \"Todo al centro\" y escuchá cómo se amontona.")
            ),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Canales")), el("div", { class: "body" }, strips))
          ),
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, "Alto = frecuencia")),
              el("div", { class: "body" }, el("div", { class: "screen" }, freqCv)),
              el("p", { class: "cap" }, "Dónde vive cada instrumento en el espectro. Donde las barras se superponen, los sonidos compiten (enmascaramiento). Bombo y bajo comparten la zona grave: por eso se usa sidechain y EQ.")
            ),
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, "Gain staging")),
              el("div", { class: "body" }, el("div", { style: { display: "flex", gap: "16px", alignItems: "stretch" } }, el("div", { class: "meters", style: { height: "120px" } }, el("div", { class: "meter" }, meterBar)), el("div", { style: { display: "grid", alignContent: "center", gap: "6px" } }, peakRead, peakNote))),
              el("p", { class: "cap" }, "Swindali recomienda que el canal más importante pique cerca de −6 dB y que el master no supere −6 dB antes del mastering.")
            )
          )
        )
      );
    },
  };

  // =====================================================================
  // LAB: ARREGLO — del loop a la canción, con curva de energía
  // =====================================================================
  const SECT = {
    intro: { name: "Intro", col: "--b-low" }, break: { name: "Breakdown", col: "--b-lowmid" }, build: { name: "Build-up", col: "--b-himid" },
    drop: { name: "Drop", col: "--b-pres" }, outro: { name: "Outro", col: "--b-sub" }, main: { name: "Main", col: "--b-mid" }, peak: { name: "Peak", col: "--b-air" },
  };
  const ROWS = ["kick", "clap", "hat", "bass", "pad", "lead", "fx"];
  const W = { kick: 3, clap: 1.4, hat: 1.2, bass: 3, pad: 1.5, lead: 2.6, fx: 1.4 };
  const layersFor = (type, k, n) => {
    const full = ["kick", "clap", "hat", "bass", "pad", "lead"];
    switch (type) {
      case "intro": return k < n / 2 ? ["kick"] : k < n - 1 ? ["kick", "hat"] : ["kick", "hat", "pad"];
      case "break": return k === 0 ? ["pad", "fx"] : ["pad", "lead"];
      case "build": return k === n - 1 ? ["clap", "hat", "pad", "lead", "fx"] : ["clap", "pad", "fx"];
      case "drop": case "peak": return k >= n / 2 ? full.concat(k === n - 1 ? ["fx"] : []) : full;
      case "main": return ["kick", "clap", "hat", "bass", "pad"];
      case "outro": return k < n / 4 ? ["kick", "clap", "hat", "bass"] : k < n / 2 ? ["kick", "clap", "hat"] : ["kick"];
    }
    return [];
  };
  const TEMPLATES = {
    swindali: { name: "EDM según Swindali", note: "Intro 16 · Breakdown · Build-up (algo nuevo cada 4–8 compases) · Drop 16–32 · repetir · Outro 16", secs: [["intro", 16], ["break", 8], ["build", 8], ["drop", 16], ["break", 8], ["build", 8], ["drop", 16], ["outro", 16]] },
    habits: { name: "Club según Music Habits", note: "Intro 8–16 · Bass drop 32 · Breakdown 4–8 · Main 32–64 · Breakdown corto · Peak 32–64 · Outro 8–16", secs: [["intro", 16], ["drop", 32], ["break", 8], ["main", 32], ["build", 4], ["peak", 32], ["outro", 16]] },
    loop: { name: "Solo el loop (16 compases)", note: "Así suena un loop que nunca se convierte en canción.", secs: [["drop", 16]] },
  };
  L.arrange = {
    title: "Arreglo", tag: "Estructura · Energía", color: "--b-pres",
    desc: "Convertí un loop en un tema: secciones, capas que entran y salen, y la curva de energía.",
    render(root) {
      const c = A.ctx();
      const g = A.track(new A.Groove({ bpm: 128, lead: true }));
      g.pattern = L.patternFrom(L.GENRES[0]);
      g.connect(A.master);
      let blocks = [], mode = "resumen", cur = -1, tplKey = "swindali";
      const build = (key) => {
        tplKey = key; blocks = [];
        TEMPLATES[key].secs.forEach(([type, bars], si) => {
          const n = Math.max(1, bars / 4);
          for (let k = 0; k < n; k++) blocks.push({ type, si, k, n, on: new Set(layersFor(type, k, n)) });
        });
      };
      build("swindali");

      const energyCv = V.canvas(130);
      const gridWrap = el("div", { class: "arr" });
      const timeInfo = el("div", { class: "stat-row" });
      const noteP = el("p", { class: "eyebrow", style: { margin: 0 } });
      const renderGrid = () => {
        const n = blocks.length;
        const cols = "78px repeat(" + n + ", minmax(18px, 1fr))";
        const grid = el("div", { class: "arr-grid", style: { minWidth: Math.max(640, 80 + n * 22) + "px" } });
        // section header
        const head = el("div", { class: "arr-row", style: { gridTemplateColumns: cols } }, el("span"));
        let i = 0;
        while (i < n) {
          let j = i; while (j < n && blocks[j].si === blocks[i].si) j++;
          const sec = SECT[blocks[i].type];
          head.append(el("div", { class: "arr-sec" + (cur >= i && cur < j ? " now" : ""), style: { gridColumn: "span " + (j - i), borderTop: "3px solid " + V.css(sec.col) }, title: sec.name + " · " + (j - i) * 4 + " compases" }, sec.name + " " + (j - i) * 4));
          i = j;
        }
        grid.append(head);
        ROWS.forEach((r) => {
          const row = el("div", { class: "arr-row", style: { gridTemplateColumns: cols } }, el("span", { class: "arr-name" }, TN[r]));
          blocks.forEach((b, bi) => {
            const cell = el("button", { type: "button", class: "arr-cell" + (b.on.has(r) ? " on" : ""), "aria-label": TN[r] + " bloque " + (bi + 1), style: { "--rc": V.css(TC[r]), outline: bi === cur ? "2px solid " + V.css("--ink") : "none" } });
            cell.addEventListener("click", () => { b.on.has(r) ? b.on.delete(r) : b.on.add(r); renderGrid(); });
            row.append(cell);
          });
          grid.append(row);
        });
        gridWrap.replaceChildren(grid);
        // time stats
        const barSec = (4 * 60) / g.bpm, total = blocks.length * 4 * barSec;
        const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
        const firstDrop = blocks.findIndex((b) => b.type === "drop" || b.type === "peak");
        timeInfo.replaceChildren(
          el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Duración"), el("div", { class: "big-read", style: { fontSize: "30px" } }, fmt(total))),
          el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Compases"), el("div", { class: "big-read", style: { fontSize: "30px" } }, blocks.length * 4)),
          el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Primer drop"), el("div", { class: "big-read", style: { fontSize: "30px", color: firstDrop * 4 * barSec > 60 ? V.css("--warn") : V.css("--ink") } }, firstDrop < 0 ? "—" : fmt(firstDrop * 4 * barSec)))
        );
        noteP.textContent = TEMPLATES[tplKey].note;
      };
      renderGrid();

      V.loop(() => {
        const { g: x, w, h } = V.fit(energyCv, 130);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        const n = blocks.length, bw = w / n, maxE = Object.values(W).reduce((a, b) => a + b, 0);
        // section color strips
        blocks.forEach((b, i) => { x.fillStyle = V.css(SECT[b.type].col); x.globalAlpha = 0.18; x.fillRect(i * bw, 0, bw, h); x.globalAlpha = 1; });
        x.beginPath(); x.moveTo(0, h);
        blocks.forEach((b, i) => {
          let e = 0; b.on.forEach((r) => (e += W[r]));
          if (b.type === "build") e += (b.k + 1) / b.n * 2;
          const y = h - 10 - (e / (maxE + 2)) * (h - 26);
          x.lineTo(i * bw, y); x.lineTo((i + 1) * bw, y);
        });
        x.lineTo(w, h); x.closePath();
        x.fillStyle = V.css("--accent"); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 1;
        x.strokeStyle = V.css("--accent"); x.lineWidth = 2; x.stroke();
        // 60 s marker (real time)
        const barSec = (4 * 60) / g.bpm, x60 = (60 / (barSec * 4)) * bw;
        if (x60 < w) { x.strokeStyle = V.css("--warn"); x.setLineDash([3, 3]); x.beginPath(); x.moveTo(x60, 0); x.lineTo(x60, h); x.stroke(); x.setLineDash([]); x.fillStyle = V.css("--warn"); x.font = "10px " + V.css("--f-mono"); x.fillText("1:00", x60 + 4, 12); }
        if (cur >= 0) { x.fillStyle = V.css("--screen-ink"); x.fillRect(cur * bw, 0, 2, h); }
        x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.7; x.font = "10px " + V.css("--f-mono"); x.fillText("ENERGÍA", 8, 14); x.globalAlpha = 1;
      });

      // playback
      const riser = (t, dur) => {
        const n = A.noise(), bp = c.createBiquadFilter(), ng = c.createGain();
        bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
        ng.gain.setValueAtTime(0.001, t); ng.gain.exponentialRampToValueAtTime(0.35, t + dur);
        n.connect(bp).connect(ng).connect(g.buses.fx); n.start(t); n.stop(t + dur + 0.02);
        const o = c.createOscillator(), og = c.createGain(); o.type = "sawtooth";
        o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
        og.gain.setValueAtTime(0.001, t); og.gain.exponentialRampToValueAtTime(0.05, t + dur);
        o.connect(og).connect(g.buses.fx); o.start(t); o.stop(t + dur + 0.02);
      };
      const impact = (t) => {
        const n = A.noise(), hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = "highpass"; hp.frequency.value = 4000;
        ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        n.connect(hp).connect(ng).connect(g.buses.fx); n.start(t); n.stop(t + 1.7);
        A.voices.kick(g.buses.fx, t, 1);
      };
      g.onBar = (bar, t, barDur) => {
        const bi = mode === "resumen" ? bar : Math.floor(bar / 4);
        const sub = mode === "resumen" ? 0 : bar % 4;
        if (bi >= blocks.length) { setTimeout(() => { g.stop(); cur = -1; renderGrid(); play.setOn(false); }, Math.max(0, (t - c.currentTime) * 1000)); g.mutes = { kick: 1, snare: 1, clap: 1, hat: 1, bass: 1, pad: 1, lead: 1 }; return; }
        const b = blocks[bi], prev = blocks[bi - 1];
        g.mutes = {}; ["kick", "clap", "hat", "bass", "pad", "lead"].forEach((r) => (g.mutes[r] = !b.on.has(r))); g.mutes.snare = true;
        const hp = g.hp.frequency;
        if (b.type === "build" && b.on.has("fx")) {
          const total = b.n * (mode === "resumen" ? 1 : 4), pos = b.k * (mode === "resumen" ? 1 : 4) + sub;
          if (pos === 0) { riser(t, total * barDur); hp.cancelScheduledValues(t); hp.setValueAtTime(10, t); hp.exponentialRampToValueAtTime(900, t + total * barDur); }
          if (pos === total - 1) for (let s = 0; s < 16; s++) A.voices.snare(g.buses.fx, t + (s * barDur) / 16, 0.25 + (s / 16) * 0.75);
        } else if (sub === 0) { hp.cancelScheduledValues(t); hp.setValueAtTime(10, t); }
        if (sub === 0 && prev && prev.type === "build" && (b.type === "drop" || b.type === "peak")) impact(t);
        if (sub === 0 && b.type === "break" && b.k === 0 && b.on.has("fx")) impact(t);
        if (sub === 0) setTimeout(() => { cur = bi; renderGrid(); }, Math.max(0, (t - c.currentTime) * 1000));
      };
      const play = U.playBtn("Reproducir tema", (on) => { if (on) { g.start(); } else { g.stop(); g.hp.frequency.cancelScheduledValues(0); g.hp.frequency.value = 10; cur = -1; renderGrid(); } });
      const modeSeg = U.seg([["resumen", "Resumen: 1 compás por bloque"], ["real", "Tiempo real"]], "resumen", (v) => (mode = v), "Modo de reproducción");
      const tplSeg = U.seg(Object.keys(TEMPLATES).map((k) => [k, TEMPLATES[k].name]), "swindali", (k) => { build(k); cur = -1; renderGrid(); }, "Plantilla");
      const bpm = U.slider({ label: "Tempo", min: 90, max: 175, step: 1, value: 128, unit: " BPM", onInput: (v) => { g.bpm = v; renderGrid(); } });

      root.append(
        el("div", { class: "stack" },
          el("div", { class: "widget" },
            el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Mapa del tema · cada celda = 4 compases"), el("div", { class: "btn-row" }, play)),
            el("div", { class: "body" }, tplSeg, noteP, el("div", { class: "screen" }, energyCv), gridWrap, el("div", { class: "controls" }, el("div", { class: "ctl" }, el("label", null, el("span", null, "Reproducción")), modeSeg), bpm), timeInfo),
            el("p", { class: "cap" }, "Encendé y apagá capas por bloque y mirá cómo cambia la curva de energía. En los build-ups, la fila FX dispara un riser (ruido que sube en frecuencia), un redoble de caja y un filtro paso alto que se abre; el drop entra con un impacto. La línea de 1:00 marca la regla del primer estribillo antes del minuto.")
          )
        )
      );
    },
  };
})(window.S);
