/* Señal Lab — Labs: EQ, Compresor, Mastering, Oído, Síntesis */
window.S = window.S || {};
(function (S) {
  const L = (S.labs = S.labs || {});
  const { el } = S.ui, U = S.ui, A = S.audio, V = S.viz;

  // shared: response curve of a chain of BiquadFilterNodes
  const NPTS = 240;
  const FREQS = new Float32Array(NPTS).map((_, i) => 20 * Math.pow(1000, i / (NPTS - 1)));
  const response = (filters) => {
    const tot = new Float32Array(NPTS).fill(0), mag = new Float32Array(NPTS), ph = new Float32Array(NPTS);
    filters.forEach((f) => { f.getFrequencyResponse(FREQS, mag, ph); for (let i = 0; i < NPTS; i++) tot[i] += 20 * Math.log10(Math.max(1e-5, mag[i])); });
    return tot;
  };
  const drawCurve = (x, w, h, db, range, color, fill) => {
    x.beginPath();
    for (let i = 0; i < NPTS; i++) { const px = V.fx(FREQS[i], w), py = h / 2 - (Math.max(-range, Math.min(range, db[i])) / range) * (h / 2 - 12); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.strokeStyle = color; x.lineWidth = 2.5; x.stroke();
    if (fill) { x.lineTo(w, h / 2); x.lineTo(0, h / 2); x.closePath(); x.fillStyle = color; x.globalAlpha = 0.14; x.fill(); x.globalAlpha = 1; }
  };
  const dbGrid = (x, w, h, range, step) => {
    x.font = "10px " + V.css("--f-mono");
    for (let d = -range; d <= range; d += step) {
      const y = h / 2 - (d / range) * (h / 2 - 12);
      x.strokeStyle = V.css("--screen-grid"); x.globalAlpha = d === 0 ? 1 : 0.6; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke();
      x.globalAlpha = 0.5; x.fillStyle = V.css("--screen-ink"); if (d !== range && d !== -range) x.fillText((d > 0 ? "+" : "") + d + " dB", w - 44, y - 3);
      x.globalAlpha = 1;
    }
  };

  // =====================================================================
  // LAB: EQ
  // =====================================================================
  L.eq = {
    title: "Ecualizador", tag: "Frecuencia · Espectro", color: "--b-mid",
    desc: "EQ paramétrico sobre el espectro en vivo. Arrastrá los puntos y escuchá cada zona.",
    render(root) {
      const c = A.ctx();
      const g = A.track(new A.Groove({ bpm: 122, lead: true }));
      g.pattern = L.patternFrom(L.GENRES[0]);
      const noise = c.createGain(); let noiseSrc = null;
      const eqIn = c.createGain(), eqOut = c.createGain(), wet = c.createGain(), dry = c.createGain(); dry.gain.value = 0;
      const out = c.createGain(), an = V.mkAnalyser(8192, 0.82);
      out.connect(an).connect(A.master);
      const B = [
        { type: "highpass", f: 30, q: 0.7, gain: 0, on: false, name: "HPF" },
        { type: "lowshelf", f: 100, q: 0.7, gain: 0, on: true, name: "Graves" },
        { type: "peaking", f: 400, q: 1.2, gain: 0, on: true, name: "Medios 1" },
        { type: "peaking", f: 2500, q: 1.2, gain: 0, on: true, name: "Medios 2" },
        { type: "highshelf", f: 9000, q: 0.7, gain: 0, on: true, name: "Agudos" },
      ];
      B.forEach((b) => { b.node = c.createBiquadFilter(); });
      const applyB = (b) => {
        const n = b.node, t = c.currentTime;
        n.type = b.type;
        // a disabled band stays in the chain but is flat (HPF parked at 5 Hz, shelves/peaks at 0 dB)
        n.frequency.setTargetAtTime(!b.on && b.type === "highpass" ? 5 : b.f, t, 0.01);
        n.Q.setTargetAtTime(b.q, t, 0.01);
        n.gain.setTargetAtTime(b.on ? b.gain : 0, t, 0.01);
      };
      B.forEach(applyB);
      eqIn.connect(B[0].node); for (let i = 0; i < B.length - 1; i++) B[i].node.connect(B[i + 1].node);
      B[B.length - 1].node.connect(wet).connect(eqOut); eqIn.connect(dry).connect(eqOut);

      let target = "mix", playing = false;
      const TRACKS = ["kick", "bass", "pad", "lead"];
      const routeTarget = (t) => {
        try { g.out.disconnect(); } catch (e) {} try { eqOut.disconnect(); } catch (e) {} try { noise.disconnect(); } catch (e) {}
        TRACKS.forEach((n) => g.restore(n));
        target = t;
        if (t === "mix") { g.out.connect(eqIn); eqOut.connect(out); }
        else if (t === "noise") { noise.connect(eqIn); eqOut.connect(out); g.out.connect(out); }
        else { g.out.connect(out); g.insert(t, eqIn, eqOut); }
        if (playing) { stopSrc(); startSrc(); }
      };
      const startSrc = () => {
        if (target === "noise") { noiseSrc = A.noise("pink", true); noiseSrc.connect(noise); noise.gain.value = 0.5; noiseSrc.start(); }
        else g.start();
      };
      const stopSrc = () => { g.stop(); if (noiseSrc) { try { noiseSrc.stop(); } catch (e) {} noiseSrc = null; } };
      A.track({ stop: stopSrc });
      routeTarget("mix");

      const cv = V.canvas(320);
      const RANGE = 18;
      const handlePos = (b, w, h) => ({ x: V.fx(b.f, w), y: b.type === "highpass" ? h / 2 : h / 2 - (b.gain / RANGE) * (h / 2 - 12) });
      let drag = null, hover = -1;
      const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const near = (x, y) => { const w = cv.clientWidth, h = 320; let k = -1, bd = 22; B.forEach((b, i) => { const p = handlePos(b, w, h); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; k = i; } }); return k; };
      cv.addEventListener("pointerdown", (e) => { const [x, y] = pt(e); drag = near(x, y); if (drag >= 0) { cv.setPointerCapture(e.pointerId); B[drag].on = true; ui[drag].on.checked = true; e.preventDefault(); } });
      cv.addEventListener("pointermove", (e) => {
        const [x, y] = pt(e);
        if (drag === null || drag < 0) { hover = near(x, y); cv.style.cursor = hover >= 0 ? "grab" : "crosshair"; return; }
        const w = cv.clientWidth, h = 320, b = B[drag];
        b.f = Math.max(20, Math.min(20000, V.xf(x, w)));
        if (b.type !== "highpass") b.gain = Math.max(-RANGE, Math.min(RANGE, ((h / 2 - y) / (h / 2 - 12)) * RANGE));
        applyB(b); syncUi(drag);
      });
      const endDrag = () => (drag = null);
      cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
      cv.addEventListener("wheel", (e) => { const [x, y] = pt(e); const k = near(x, y); if (k < 0) return; e.preventDefault(); const b = B[k]; b.q = Math.max(0.3, Math.min(18, b.q * (e.deltaY < 0 ? 1.12 : 0.89))); applyB(b); syncUi(k); }, { passive: false });

      const bandLabel = el("div", { class: "eyebrow", style: { margin: 0, minHeight: "1.5em" } }, "Pasá el mouse por el espectro para ver qué zona es.");
      cv.addEventListener("mousemove", (e) => { const [x] = pt(e); const f = V.xf(x, cv.clientWidth); const bd = V.bandFor(f); bandLabel.innerHTML = '<b style="color:' + V.css(bd.v) + '">' + V.fmtHz(f) + " Hz · " + bd.name + "</b> · " + bd.desc; });

      V.loop(() => {
        const { g: x, w, h } = V.fit(cv, 320);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        V.freqGrid(x, w, h, { bands: true }); dbGrid(x, w, h, RANGE, 6);
        V.drawSpectrum(x, w, h, an, { fill: true, min: -110, max: -15, alpha: 0.3 });
        const db = response(B.map((b) => b.node));
        drawCurve(x, w, h, db, RANGE, V.css("--accent"), true);
        B.forEach((b, i) => {
          const p = handlePos(b, w, h);
          x.beginPath(); x.arc(p.x, p.y, i === hover || i === drag ? 10 : 8, 0, 7);
          x.fillStyle = b.on ? V.css(V.bandFor(b.f).v) : V.css("--screen-grid"); x.fill();
          x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke();
          x.fillStyle = "#fff"; x.font = "600 10px " + V.css("--f-mono"); x.textAlign = "center"; x.fillText(String(i), p.x, p.y + 3.5); x.textAlign = "left";
        });
        if (dry.gain.value > 0.5) { x.fillStyle = V.css("--warn"); x.font = "600 12px " + V.css("--f-mono"); x.fillText("EQ EN BYPASS", 10, 18); }
      });

      // per-band controls
      const ui = [];
      const bandsBox = el("div", { class: "controls", style: { gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" } });
      B.forEach((b, i) => {
        const on = el("input", { type: "checkbox", id: "eqon" + i }); on.checked = b.on;
        on.addEventListener("change", () => { b.on = on.checked; applyB(b); });
        const f = U.slider({ label: "Frecuencia", min: 20, max: 20000, log: true, value: b.f, fmt: (v) => V.fmtHz(v) + " Hz", onInput: (v) => { b.f = v; applyB(b); } });
        const gn = U.slider({ label: "Ganancia", min: -RANGE, max: RANGE, step: 0.5, value: b.gain, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(1) + " dB", onInput: (v) => { b.gain = v; applyB(b); } });
        const q = U.slider({ label: "Q (ancho)", min: 0.3, max: 18, log: true, value: b.q, fmt: (v) => v.toFixed(1), onInput: (v) => { b.q = v; applyB(b); } });
        ui.push({ on, f, gn, q });
        bandsBox.append(el("div", { class: "group" }, el("label", { class: "gt", for: "eqon" + i }, on, i + " · " + b.name), f, b.type === "highpass" ? null : gn, b.type === "peaking" || b.type === "highpass" ? q : null));
      });
      const syncUi = (i) => { const b = B[i]; ui[i].f.set(b.f, true); ui[i].gn.set(b.gain, true); ui[i].q.set(b.q, true); ui[i].on.checked = b.on; };

      const srcSeg = U.seg([["mix", "Mezcla completa"], ["kick", "Solo al bombo"], ["bass", "Solo al bajo"], ["pad", "Solo al pad"], ["noise", "Ruido rosa"]], "mix", routeTarget, "Dónde se aplica el EQ");
      const PRESETS = [
        { n: "Plano", t: null, b: [[0, 30, 0.7, 0, false], [1, 100, 0.7, 0], [2, 400, 1.2, 0], [3, 2500, 1.2, 0], [4, 9000, 0.7, 0]] },
        { n: "HPF a 30 Hz", src: "Swindali", t: "mix", b: [[0, 30, 0.7, 0, true]] },
        { n: "Bombo: menos \"caja\", más click", src: "Swindali", t: "kick", b: [[2, 350, 1.6, -7], [3, 2000, 1.4, 4], [1, 110, 0.7, 2]] },
        { n: "Bajo con HPF ~150 Hz", src: "Rogers", t: "bass", b: [[0, 150, 0.7, 0, true]] },
        { n: "Calidez 150–500 Hz", src: "Rogers", t: "mix", b: [[2, 260, 1, 3]] },
        { n: "Chispa 8–10 kHz", src: "Rogers", t: "mix", b: [[3, 9000, 2, 2.5]] },
        { n: "Domar estridencia 5–6 kHz", src: "Rogers", t: "mix", b: [[3, 5500, 6, -3]] },
        { n: "Barro (error típico)", src: null, t: "mix", b: [[2, 300, 1, 9]] },
        { n: "Radio / teléfono", src: null, t: "mix", b: [[0, 450, 0.9, 0, true], [4, 3500, 0.7, -18]] },
      ];
      const presetRow = el("div", { class: "btn-row" }, PRESETS.map((p) => el("button", {
        type: "button", class: "btn sm", title: p.src ? "Basado en " + p.src : "",
        onclick: () => {
          PRESETS[0].b.forEach(([i, f, q, gn, on]) => Object.assign(B[i], { f, q, gain: gn, on: on === undefined ? true : on }));
          p.b.forEach(([i, f, q, gn, on]) => Object.assign(B[i], { f, q, gain: gn, on: on === undefined ? true : on }));
          B.forEach((b, i) => { applyB(b); syncUi(i); });
          if (p.t && p.t !== target) { routeTarget(p.t); srcSeg.set(p.t); }
        },
      }, p.n + (p.src ? " · " + p.src : ""))));
      const byp = el("button", { type: "button", class: "btn sm" }, "A/B (bypass)");
      byp.addEventListener("click", () => { const b = dry.gain.value < 0.5; dry.gain.value = b ? 1 : 0; wet.gain.value = b ? 0 : 1; byp.classList.toggle("on", b); });
      const play = U.playBtn("Tocar", (on) => { playing = on; on ? startSrc() : stopSrc(); });

      root.append(
        el("div", { class: "stack" },
          el("div", { class: "widget" },
            el("header", null, el("span", { class: "t" }, el("b", null, "●"), "EQ paramétrico · 5 bandas"), el("div", { class: "btn-row" }, byp, play)),
            el("div", { class: "body" }, srcSeg, el("div", { class: "screen" }, cv), bandLabel, presetRow),
            el("p", { class: "cap" }, "Arrastrá los puntos numerados: horizontal = frecuencia, vertical = ganancia. Con la rueda del mouse sobre un punto cambiás el ancho (Q). \"Solo al bajo\" aplica el EQ a una pista mientras suena toda la mezcla, igual que en un DAW.")
          ),
          el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Bandas")), el("div", { class: "body" }, bandsBox))
        )
      );
    },
  };

  // =====================================================================
  // LAB: COMPRESOR
  // =====================================================================
  L.comp = {
    title: "Compresor", tag: "Dinámica", color: "--b-himid",
    desc: "Curva de transferencia, reducción de ganancia y la forma de onda antes y después.",
    render(root) {
      const c = A.ctx();
      const g = A.track(new A.Groove({ bpm: 120, lead: false }));
      g.pattern = L.patternFrom(L.GENRES[0]);
      g.pattern.snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1];
      g.pattern.hat = [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0];
      g.mutes = { lead: true, pad: true, bass: true, clap: true };
      const preAn = V.mkAnalyser(2048, 0), postAn = V.mkAnalyser(2048, 0);
      const comp = c.createDynamicsCompressor(), makeup = c.createGain(), byp = c.createGain(), out = c.createGain();
      byp.gain.value = 0;
      g.out.connect(preAn); g.out.connect(comp); comp.connect(makeup).connect(out); g.out.connect(byp).connect(out);
      out.connect(postAn).connect(A.master);
      const st = { thr: -24, ratio: 4, knee: 6, att: 0.01, rel: 0.15, mk: 6 };
      const apply = () => { const t = c.currentTime; comp.threshold.setValueAtTime(st.thr, t); comp.ratio.setValueAtTime(st.ratio, t); comp.knee.setValueAtTime(st.knee, t); comp.attack.setValueAtTime(st.att, t); comp.release.setValueAtTime(st.rel, t); makeup.gain.setTargetAtTime(A.dbToGain(st.mk), t, 0.02); };
      apply();
      const curveOut = (x) => {
        const T = st.thr, K = st.knee, R = st.ratio;
        if (x < T - K / 2) return x;
        if (x > T + K / 2) return T + (x - T) / R;
        const d = x - T + K / 2; return x + ((1 / R - 1) * d * d) / (2 * K);
      };
      const hist = []; const N = 360; let inHold = -60, holdT = 0;
      const tcv = V.canvas(280), hcv = V.canvas(200);
      const grBar = el("i", { style: { height: "0%", background: "var(--hot)", top: 0, bottom: "auto" } });
      const grRead = el("span", { class: "big-read" }, "0.0");
      V.loop((ts) => {
        const pi = V.rms(preAn), po = V.rms(postAn);
        const inDb = Math.max(-60, A.gainToDb(pi.peak)), outDb = Math.max(-60, A.gainToDb(po.peak)), gr = comp.reduction || 0;
        if (inDb > inHold || ts - holdT > 2500) { inHold = inDb; holdT = ts; }
        hist.push([inDb, outDb, gr]); if (hist.length > N) hist.shift();
        // transfer curve
        let { g: x, w, h } = V.fit(tcv, 280);
        const sz = Math.min(w, h), ox = (w - sz) / 2;
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        const map = (d) => ((d + 60) / 60) * (sz - 30);
        x.strokeStyle = V.css("--screen-grid"); x.lineWidth = 1; x.font = "10px " + V.css("--f-mono"); x.fillStyle = V.css("--screen-ink");
        for (let d = -60; d <= 0; d += 12) { const p = map(d); x.beginPath(); x.moveTo(ox + 24 + p, 6); x.lineTo(ox + 24 + p, sz - 24); x.stroke(); x.beginPath(); x.moveTo(ox + 24, sz - 24 - p); x.lineTo(ox + sz - 6, sz - 24 - p); x.stroke(); x.globalAlpha = 0.5; x.fillText(String(d), ox + 18 + p, sz - 10); x.fillText(String(d), ox, sz - 21 - p); x.globalAlpha = 1; }
        x.setLineDash([3, 4]); x.strokeStyle = V.css("--screen-ink"); x.globalAlpha = 0.4; x.beginPath(); x.moveTo(ox + 24, sz - 24); x.lineTo(ox + 24 + map(0), sz - 24 - map(0)); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
        x.beginPath(); for (let d = -60; d <= 0; d += 0.5) { const px = ox + 24 + map(d), py = sz - 24 - map(curveOut(d)); d === -60 ? x.moveTo(px, py) : x.lineTo(px, py); }
        x.strokeStyle = V.css("--b-himid"); x.lineWidth = 3; x.stroke();
        const tp = map(st.thr); x.strokeStyle = V.css("--hot"); x.setLineDash([2, 3]); x.beginPath(); x.moveTo(ox + 24 + tp, 6); x.lineTo(ox + 24 + tp, sz - 24); x.stroke(); x.setLineDash([]);
        x.fillStyle = V.css("--hot"); x.fillText("umbral", ox + 28 + tp, 16);
        x.beginPath(); x.arc(ox + 24 + map(inDb), sz - 24 - map(curveOut(inDb)), 6, 0, 7); x.fillStyle = "#fff"; x.fill();
        x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.7; x.fillText("ENTRADA (dB) →", ox + sz - 110, sz - 28); x.save(); x.translate(ox + 10, 90); x.rotate(-Math.PI / 2); x.fillText("SALIDA (dB) →", 0, 0); x.restore(); x.globalAlpha = 1;
        // history
        ({ g: x, w, h } = V.fit(hcv, 200));
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        const mid = h * 0.6, amp = (d) => Math.max(0, (d + 48) / 48) * (h * 0.38);
        const bw = w / N;
        hist.forEach(([i, o, r], k) => {
          const xx = k * bw;
          x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.22; const a = amp(i); x.fillRect(xx, mid - a, bw + 0.5, a * 2);
          x.globalAlpha = 0.9; x.fillStyle = V.css("--b-himid"); const b2 = amp(o); x.fillRect(xx, mid - b2, bw + 0.5, b2 * 2);
          x.fillStyle = V.css("--hot"); x.globalAlpha = 0.9; x.fillRect(xx, 0, bw + 0.5, Math.min(h * 0.18, (-r / 24) * h * 0.18));
          x.globalAlpha = 1;
        });
        x.fillStyle = V.css("--screen-ink"); x.font = "10px " + V.css("--f-mono"); x.globalAlpha = 0.7; x.fillText("REDUCCIÓN ↓", 8, h * 0.18 + 12); x.fillText("gris = entrada · color = salida", 8, h - 8); x.globalAlpha = 1;
        grBar.style.height = Math.min(100, (-gr / 24) * 100) + "%";
        grRead.textContent = gr.toFixed(1);
      });

      const sl = {};
      sl.thr = U.slider({ label: "Umbral (threshold)", min: -60, max: 0, step: 0.5, value: st.thr, unit: " dB", onInput: (v) => { st.thr = v; apply(); } });
      sl.ratio = U.slider({ label: "Ratio", min: 1, max: 20, step: 0.1, value: st.ratio, fmt: (v) => v.toFixed(1) + ":1", onInput: (v) => { st.ratio = v; apply(); } });
      sl.knee = U.slider({ label: "Knee", min: 0, max: 30, step: 0.5, value: st.knee, unit: " dB", onInput: (v) => { st.knee = v; apply(); } });
      sl.att = U.slider({ label: "Ataque", min: 0.001, max: 0.5, log: true, value: st.att, fmt: (v) => (v * 1000).toFixed(v < 0.01 ? 1 : 0) + " ms", onInput: (v) => { st.att = v; apply(); } });
      sl.rel = U.slider({ label: "Release", min: 0.02, max: 1, log: true, value: st.rel, fmt: (v) => Math.round(v * 1000) + " ms", onInput: (v) => { st.rel = v; apply(); } });
      sl.mk = U.slider({ label: "Ganancia de compensación", min: 0, max: 24, step: 0.5, value: st.mk, unit: " dB", onInput: (v) => { st.mk = v; apply(); } });
      const setSt = (o) => { Object.assign(st, o); for (const k in o) sl[k] && sl[k].set(o[k], true); apply(); };
      const pct = el("div", { class: "btn-row" }, el("span", { class: "eyebrow" }, "Umbral al % de la onda:"),
        [80, 65, 50, 40].map((p) => el("button", { type: "button", class: "btn sm", onclick: () => setSt({ thr: Math.min(0, Math.max(-60, Math.round((inHold + 20 * Math.log10(p / 100)) * 2) / 2)) }) }, p + "%")));
      const RAT = [["2:1 extremadamente leve", 2], ["3:1", 3], ["4:1 leve", 4], ["5:1 promedio", 5], ["8:1 pesada", 8], ["20:1 \"brickwall\"", 20]];
      const ratRow = el("div", { class: "btn-row" }, el("span", { class: "eyebrow" }, "Ratios de Rogers:"), RAT.map(([n, r]) => el("button", { type: "button", class: "btn sm", onclick: () => setSt({ ratio: r }) }, n)));
      const busBtn = el("button", { type: "button", class: "btn sm", onclick: () => setSt({ ratio: 2.5, att: 0.03, rel: 0.2, knee: 6, thr: -18, mk: 3 }) }, "Bus EDM: 2,5:1 con ataque lento · Swindali");
      const punchBtn = el("button", { type: "button", class: "btn sm", onclick: () => setSt({ ratio: 6, att: 0.025, rel: 0.08, knee: 2, thr: -26, mk: 8 }) }, "Más pegada (ataque lento deja pasar el golpe)");
      const killBtn = el("button", { type: "button", class: "btn sm", onclick: () => setSt({ ratio: 20, att: 0.001, rel: 0.4, knee: 0, thr: -40, mk: 18 }) }, "Sobrecomprimido (error)");
      const srcSeg = U.seg([["drums", "Batería"], ["full", "Mezcla completa"]], "drums", (v) => { g.mutes = v === "drums" ? { lead: true, pad: true, bass: true, clap: true } : { clap: true }; }, "Fuente");
      const bypBtn = el("button", { type: "button", class: "btn sm" }, "A/B (bypass)");
      bypBtn.addEventListener("click", () => { const on = byp.gain.value < 0.5; byp.gain.value = on ? 1 : 0; makeup.gain.cancelScheduledValues(0); makeup.gain.value = on ? 0 : A.dbToGain(st.mk); bypBtn.classList.toggle("on", on); });
      const play = U.playBtn("Tocar", (on) => { on ? g.start() : g.stop(); });

      root.append(
        el("div", { class: "lab-grid" },
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Lo que entra vs. lo que sale"), el("div", { class: "btn-row" }, bypBtn, play)),
              el("div", { class: "body" }, srcSeg, el("div", { class: "screen" }, hcv), el("div", { class: "controls" }, sl.thr, sl.ratio, sl.knee, sl.att, sl.rel, sl.mk)),
              el("p", { class: "cap" }, "Gris: la señal original. Color: la señal comprimida. Rojo arriba: cuántos dB está bajando el compresor en cada momento.")
            ),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Recetas")), el("div", { class: "body" }, ratRow, pct, el("div", { class: "btn-row" }, busBtn, punchBtn, killBtn)),
              el("p", { class: "cap" }, "Rogers no fija el umbral en dB sino como porcentaje de la altura de la onda. Estos botones lo traducen: 50% de la onda ≈ 6 dB por debajo del pico medido. El compresor del navegador llega a 20:1; Rogers usa hasta 30:1 para \"cortar la punta\"."))
          ),
          el("div", { class: "stack" },
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Curva de transferencia")), el("div", { class: "body" }, el("div", { class: "screen" }, tcv)), el("p", { class: "cap" }, "Por debajo del umbral, la salida es igual a la entrada (línea diagonal). Por encima, cada dB que entra se convierte en 1/ratio dB a la salida.")),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Reducción de ganancia")), el("div", { class: "body" }, el("div", { style: { display: "flex", gap: "16px", alignItems: "center" } }, el("div", { class: "meter", style: { height: "110px", width: "22px" } }, grBar), el("div", null, grRead, el("div", { class: "eyebrow" }, "dB de reducción")))))
          )
        )
      );
    },
  };

  // =====================================================================
  // LAB: MASTERING
  // =====================================================================
  L.master = {
    title: "Mastering", tag: "Loudness · Cadena", color: "--b-air",
    desc: "Una cadena de mastering completa con medidores, y la guerra del volumen en pantalla.",
    render(root) {
      const c = A.ctx();
      const g = A.track(new A.Groove({ bpm: 124, lead: true }));
      g.pattern = L.patternFrom(L.GENRES[1]);
      g.mutes = {};
      // give the mix some stereo so width does something
      const pan = (n, v) => { const p = c.createStereoPanner(); p.pan.value = v; g.insert(n, p, p); };
      pan("hat", 0.45); pan("lead", -0.35); pan("clap", 0.12);
      const pm = c.createChannelMerger(2), pd = c.createDelay(0.05), pin = c.createGain(); pd.delayTime.value = 0.014;
      pin.connect(pm, 0, 0); pin.connect(pd).connect(pm, 0, 1); g.insert("pad", pin, pm);
      g.out.gain.value = 0.55; // leave headroom like a real mix (~-6 dB)

      const N = (t) => c.createBiquadFilter();
      const hpf = N(); hpf.type = "highpass"; hpf.frequency.value = 30; hpf.Q.value = 0.7;
      const e1 = N(), e2 = N(), e3 = N(), e4 = N();
      e1.type = "lowshelf"; e1.frequency.value = 130; e2.type = "peaking"; e2.frequency.value = 440; e2.Q.value = 0.8;
      e3.type = "peaking"; e3.frequency.value = 3600; e3.Q.value = 0.8; e4.type = "highshelf"; e4.frequency.value = 9000;
      const glue = c.createDynamicsCompressor();
      // M/S width
      const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2);
      const mL = c.createGain(), mR = c.createGain(), sL = c.createGain(), sR = c.createGain(), M = c.createGain(), Sd = c.createGain();
      mL.gain.value = 0.5; mR.gain.value = 0.5; sL.gain.value = 0.5; sR.gain.value = -0.5;
      const sHP = N(); sHP.type = "highpass"; sHP.frequency.value = 10;
      const width = c.createGain(), inv = c.createGain(); inv.gain.value = -1;
      split.connect(mL, 0); split.connect(mR, 1); mL.connect(M); mR.connect(M);
      split.connect(sL, 0); split.connect(sR, 1); sL.connect(Sd); sR.connect(Sd);
      Sd.connect(sHP).connect(width);
      M.connect(merge, 0, 0); M.connect(merge, 0, 1); width.connect(merge, 0, 0); width.connect(inv).connect(merge, 0, 1);
      const drive = c.createGain(), lim = c.createDynamicsCompressor(), post = c.createGain(), clip = c.createWaveShaper();
      lim.ratio.value = 20; lim.knee.value = 0; lim.attack.value = 0.001; lim.release.value = 0.06; lim.threshold.value = -3;
      const out = c.createGain(), an = V.mkAnalyser(2048, 0), kAn = V.mkAnalyser(2048, 0);
      const kHs = N(), kHp = N(); kHs.type = "highshelf"; kHs.frequency.value = 1500; kHs.gain.value = 4; kHp.type = "highpass"; kHp.frequency.value = 38; kHp.Q.value = 0.5;
      const bypass = c.createGain(); bypass.gain.value = 0; const wetG = c.createGain();
      g.out.connect(hpf).connect(e1).connect(e2).connect(e3).connect(e4).connect(glue).connect(split);
      merge.connect(drive).connect(lim).connect(post).connect(clip).connect(wetG).connect(out);
      g.out.connect(bypass).connect(out);
      out.connect(an); out.connect(kHs).connect(kHp).connect(kAn); out.connect(A.master);

      const st = { hpf: true, low: 0, lowmid: 0, upmid: 0, high: 0, glue: true, gThr: -18, gRatio: 2.5, width: 1, bassMono: true, drive: 0, ceil: -0.2, lim: true };
      const setClip = (ceilDb) => {
        const n = 2048, cur = new Float32Array(n), cl = A.dbToGain(ceilDb);
        for (let i = 0; i < n; i++) { const xx = (i / (n - 1)) * 2 - 1; const a = Math.abs(xx); cur[i] = Math.sign(xx) * (a < cl * 0.9 ? a : cl * 0.9 + (cl * 0.1) * Math.tanh((a - cl * 0.9) / (cl * 0.1))); }
        clip.curve = cur;
      };
      const apply = () => {
        const t = c.currentTime, s = (p, v) => p.setTargetAtTime(v, t, 0.02);
        s(hpf.frequency, st.hpf ? 30 : 5);
        s(e1.gain, st.low); s(e2.gain, st.lowmid); s(e3.gain, st.upmid); s(e4.gain, st.high);
        s(glue.threshold, st.glue ? st.gThr : 0); s(glue.ratio, st.glue ? st.gRatio : 1); glue.attack.value = 0.03; glue.release.value = 0.2; glue.knee.value = 6;
        s(width.gain, st.width); s(sHP.frequency, st.bassMono ? 200 : 10);
        s(drive.gain, A.dbToGain(st.drive));
        s(lim.threshold, st.lim ? -3 : 0); s(lim.ratio, st.lim ? 20 : 1);
        s(post.gain, A.dbToGain((st.lim ? 3 : 0) + st.ceil));
        setClip(st.lim ? st.ceil : 6);
      };
      apply();

      const wav = V.canvas(200), hist = []; const HN = 420;
      let peakHold = -99, ph = 0, msBuf = [], lufs = -70;
      const R = { peak: el("span", { class: "big-read" }, "–"), rms: el("span", { class: "big-read" }, "–"), lufs: el("span", { class: "big-read" }, "–"), plr: el("span", { class: "big-read" }, "–") };
      V.loop((ts) => {
        const o = V.rms(an), kk = V.rms(kAn);
        const pk = A.gainToDb(o.peak), rm = A.gainToDb(o.rms);
        if (pk > peakHold || ts - ph > 1800) { peakHold = pk; ph = ts; }
        msBuf.push(kk.rms * kk.rms); if (msBuf.length > 180) msBuf.shift();
        const ms = msBuf.reduce((a, b) => a + b, 0) / msBuf.length;
        lufs = ms > 1e-9 ? -0.691 + 10 * Math.log10(ms) : -70;
        hist.push([o.peak, o.rms]); if (hist.length > HN) hist.shift();
        if (g.playing) {
          R.peak.textContent = peakHold < -80 ? "–∞" : peakHold.toFixed(1);
          R.peak.style.color = peakHold > -0.1 ? V.css("--hot") : V.css("--ink");
          R.rms.textContent = rm < -80 ? "–∞" : rm.toFixed(1);
          R.lufs.textContent = lufs < -60 ? "–" : lufs.toFixed(1);
          R.plr.textContent = (peakHold - lufs).toFixed(1);
        }
        const { g: x, w, h } = V.fit(wav, 200);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        const mid = h / 2, bw = w / HN;
        const cy = (h / 2 - 8) * A.dbToGain(st.ceil);
        hist.forEach(([p, r], k) => {
          const a = Math.min(1.05, p) * (h / 2 - 8), b = Math.min(1, r * 1.41) * (h / 2 - 8);
          x.fillStyle = V.css("--b-air"); x.globalAlpha = 0.45; x.fillRect(k * bw, mid - a, bw + 0.5, a * 2);
          x.globalAlpha = 1; x.fillRect(k * bw, mid - b, bw + 0.5, b * 2);
        });
        x.strokeStyle = V.css("--hot"); x.setLineDash([4, 4]); x.beginPath(); x.moveTo(0, mid - cy); x.lineTo(w, mid - cy); x.moveTo(0, mid + cy); x.lineTo(w, mid + cy); x.stroke(); x.setLineDash([]);
        x.fillStyle = V.css("--hot"); x.font = "10px " + V.css("--f-mono"); x.fillText("techo " + st.ceil.toFixed(1) + " dBFS", 8, Math.max(12, mid - cy - 4));
      });

      const S2 = (o) => U.slider(o);
      const ctl = {
        low: S2({ label: "LOW · 20–130 Hz", min: -6, max: 6, step: 0.5, value: 0, unit: " dB", onInput: (v) => { st.low = v; apply(); } }),
        lowmid: S2({ label: "LOWER-MIDS · 130 Hz–1,5 kHz", min: -6, max: 6, step: 0.5, value: 0, unit: " dB", onInput: (v) => { st.lowmid = v; apply(); } }),
        upmid: S2({ label: "UPPER-MIDS · 1,5–9 kHz", min: -6, max: 6, step: 0.5, value: 0, unit: " dB", onInput: (v) => { st.upmid = v; apply(); } }),
        high: S2({ label: "HIGH · 9–20 kHz", min: -6, max: 6, step: 0.5, value: 0, unit: " dB", onInput: (v) => { st.high = v; apply(); } }),
        gThr: S2({ label: "Compresor: umbral", min: -40, max: 0, step: 0.5, value: st.gThr, unit: " dB", onInput: (v) => { st.gThr = v; apply(); } }),
        gRatio: S2({ label: "Compresor: ratio", min: 1, max: 8, step: 0.1, value: st.gRatio, fmt: (v) => v.toFixed(1) + ":1", onInput: (v) => { st.gRatio = v; apply(); } }),
        width: S2({ label: "Ancho estéreo", min: 0, max: 2, step: 0.01, value: 1, fmt: (v) => Math.round(v * 100) + "%", onInput: (v) => { st.width = v; apply(); } }),
        drive: S2({ label: "Maximizador: empuje", min: 0, max: 20, step: 0.5, value: 0, fmt: (v) => "+" + v.toFixed(1) + " dB", onInput: (v) => { st.drive = v; apply(); } }),
        ceil: S2({ label: "Techo (ceiling)", min: -3, max: 0, step: 0.1, value: -0.2, unit: " dBFS", onInput: (v) => { st.ceil = v; apply(); } }),
      };
      const tog = (label, key) => { const b = el("button", { type: "button", class: "btn sm" + (st[key] ? " on" : "") }, label); b.addEventListener("click", () => { st[key] = !st[key]; b.classList.toggle("on", st[key]); apply(); }); b.sync = () => b.classList.toggle("on", !!st[key]); return b; };
      const tg = { hpf: tog("HPF 30 Hz", "hpf"), glue: tog("Compresor", "glue"), bassMono: tog("Graves en mono < 200 Hz", "bassMono"), lim: tog("Limitador", "lim") };
      const setAll = (o) => { Object.assign(st, o); for (const k in ctl) ctl[k].set(st[k], true); for (const k in tg) tg[k].sync(); apply(); };
      const base = { hpf: false, low: 0, lowmid: 0, upmid: 0, high: 0, glue: false, gThr: -18, gRatio: 2.5, width: 1, bassMono: false, drive: 0, ceil: -0.2, lim: false };
      const PRE = [
        ["Sin procesar", base],
        ["Cadena EDM (Swindali)", { hpf: true, low: 0.5, lowmid: -0.5, upmid: 0.5, high: 1.5, glue: true, gThr: -16, gRatio: 2.5, width: 1.25, bassMono: true, drive: 7, ceil: -0.2, lim: true }],
        ["Plantilla Rogers: techo −0,2 dB", { hpf: true, low: 0, lowmid: 0, upmid: 0, high: 0, glue: true, gThr: -14, gRatio: 4, width: 1.1, bassMono: true, drive: 5, ceil: -0.2, lim: true }],
        ["Guerra del volumen", { hpf: true, low: 2, lowmid: 0, upmid: 2, high: 2, glue: true, gThr: -30, gRatio: 8, width: 1.4, bassMono: true, drive: 18, ceil: -0.1, lim: true }],
      ];
      const preRow = el("div", { class: "btn-row" }, PRE.map(([n, o]) => el("button", { type: "button", class: "btn sm", onclick: () => setAll(Object.assign({}, base, o)) }, n)));
      const ab = el("button", { type: "button", class: "btn sm" }, "A/B: escuchar sin master");
      ab.addEventListener("click", () => { const on = bypass.gain.value < 0.5; bypass.gain.value = on ? 1 : 0; wetG.gain.value = on ? 0 : 1; ab.classList.toggle("on", on); });
      const play = U.playBtn("Tocar", (on) => { on ? g.start() : g.stop(); });
      const chain = el("div", { class: "btn-row", style: { gap: "4px" } }, ["HPF 30 Hz", "EQ 4 bandas", "Compresor", "Ancho M/S", "Maximizador", "Techo"].map((n, i, a) => [el("span", { class: "src-chip", style: { color: V.css("--ink"), borderColor: V.css("--b-air") } }, n), i < a.length - 1 ? el("span", { class: "eyebrow" }, "→") : null]).flat());
      const stat = (k, lab) => el("div", { class: "stat" }, el("div", { class: "eyebrow" }, lab), R[k]);

      root.append(
        el("div", { class: "lab-grid" },
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Salida del master · últimos segundos"), el("div", { class: "btn-row" }, ab, play)),
              el("div", { class: "body" }, chain, el("div", { class: "screen" }, wav), el("div", { class: "stat-row" }, stat("peak", "Pico dBFS"), stat("rms", "RMS dB"), stat("lufs", "≈ LUFS (aprox.)"), stat("plr", "Pico − loudness")), preRow),
              el("p", { class: "cap" }, "Subí el empuje del maximizador y mirá cómo la forma de onda se vuelve un ladrillo: más volumen, menos diferencia entre golpes. \"Pico − loudness\" mide cuánta dinámica queda. El LUFS es una aproximación del navegador, sirve para comparar, no para entregar.")
            )
          ),
          el("div", { class: "stack" },
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "EQ por bandas (modelo de Rogers)")), el("div", { class: "body" }, el("div", { class: "btn-row" }, tg.hpf), ctl.low, ctl.lowmid, ctl.upmid, ctl.high)),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Dinámica y estéreo")), el("div", { class: "body" }, el("div", { class: "btn-row" }, tg.glue, tg.bassMono, tg.lim), el("div", { class: "controls" }, ctl.gThr, ctl.gRatio, ctl.width, ctl.drive, ctl.ceil)))
          )
        )
      );
    },
  };

  // =====================================================================
  // LAB: OÍDO — entrenamiento de frecuencias
  // =====================================================================
  L.ear = {
    title: "Entrenamiento auditivo", tag: "Oído · Frecuencias", color: "--b-pres",
    desc: "Adiviná qué frecuencia se realzó. El ejercicio que separa a quien mezcla de quien mira.",
    render(root) {
      const c = A.ctx();
      const OPTS = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const g = A.track(new A.Groove({ bpm: 118, lead: true })); g.pattern = L.patternFrom(L.GENRES[0]); g.mutes = {};
      const pk = c.createBiquadFilter(); pk.type = "peaking"; pk.Q.value = 1.4; pk.gain.value = 0;
      const out = c.createGain(), an = V.mkAnalyser(8192, 0.85), noiseG = c.createGain();
      g.out.connect(pk); noiseG.connect(pk); pk.connect(out).connect(an).connect(A.master);
      let src = "pink", nsrc = null, target = null, eqOn = true, answered = false, level = 12;
      const score = U.store.get("ear", { ok: 0, total: 0, best: 0, streak: 0 });
      const cv = V.canvas(200);
      const msg = el("p", { style: { margin: 0, fontSize: "17px", minHeight: "1.6em" } }, "Tocá \"Nueva ronda\" para empezar.");
      const scoreEl = el("div", { class: "stat-row" });
      const paintScore = () => scoreEl.replaceChildren(
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Aciertos"), el("div", { class: "big-read", style: { fontSize: "30px" } }, score.ok + "/" + score.total)),
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Racha"), el("div", { class: "big-read", style: { fontSize: "30px" } }, score.streak)),
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Mejor racha"), el("div", { class: "big-read", style: { fontSize: "30px" } }, score.best)));
      paintScore();
      const btns = OPTS.map((f) => {
        const b = el("button", { type: "button", style: { "--bc": V.css(V.bandFor(f).v) }, disabled: true }, V.fmtHz(f));
        b.addEventListener("click", () => {
          if (answered || !target) return; answered = true; score.total++;
          const ok = f === target;
          if (ok) { score.ok++; score.streak++; score.best = Math.max(score.best, score.streak); b.classList.add("right"); msg.textContent = "¡Bien! Era " + V.fmtHz(target) + " Hz · " + V.bandFor(target).name + ". " + V.bandFor(target).desc; }
          else { score.streak = 0; b.classList.add("wrong"); btns[OPTS.indexOf(target)].classList.add("right"); msg.textContent = "Era " + V.fmtHz(target) + " Hz (" + V.bandFor(target).name + "). Activá y desactivá el EQ para escuchar la diferencia."; }
          U.store.set("ear", score); paintScore();
        });
        return b;
      });
      const startSrc = () => { stopSrc(); if (src === "pink") { nsrc = A.noise("pink", true); nsrc.connect(noiseG); noiseG.gain.value = 0.6; nsrc.start(); } else g.start(); };
      const stopSrc = () => { g.stop(); if (nsrc) { try { nsrc.stop(); } catch (e) {} nsrc = null; } };
      A.track({ stop: stopSrc });
      const round = () => {
        target = OPTS[Math.floor(Math.random() * OPTS.length)]; answered = false; eqOn = true; eqBtn.classList.add("on");
        pk.frequency.value = target; pk.gain.setTargetAtTime(level, c.currentTime, 0.02);
        btns.forEach((b) => { b.disabled = false; b.className = ""; });
        msg.textContent = "¿Qué frecuencia está realzada +" + level + " dB?";
        startSrc(); play.setOn(true);
      };
      const eqBtn = el("button", { type: "button", class: "btn sm on" }, "EQ activado");
      eqBtn.addEventListener("click", () => { eqOn = !eqOn; pk.gain.setTargetAtTime(eqOn && target ? level : 0, c.currentTime, 0.02); eqBtn.classList.toggle("on", eqOn); eqBtn.textContent = eqOn ? "EQ activado" : "EQ desactivado"; });
      const play = U.playBtn("Escuchar", (on) => { on ? startSrc() : stopSrc(); }, "");
      const newBtn = el("button", { type: "button", class: "btn primary", onclick: round }, "Nueva ronda");
      const srcSeg = U.seg([["pink", "Ruido rosa"], ["music", "Música"]], "pink", (v) => { src = v; if (play.textContent.includes("Detener")) startSrc(); }, "Fuente");
      const lvlSeg = U.seg([[12, "Fácil +12 dB"], [9, "Medio +9 dB"], [6, "Difícil +6 dB"]], 12, (v) => { level = v; if (target && eqOn) pk.gain.value = v; }, "Dificultad");
      V.loop(() => {
        const { g: x, w, h } = V.fit(cv, 200);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        V.freqGrid(x, w, h, { bands: true });
        V.drawSpectrum(x, w, h, an, { fill: true, min: -110, max: -20 });
        if (answered && target) { const xx = V.fx(target, w); x.fillStyle = V.css(V.bandFor(target).v); x.globalAlpha = 0.25; x.fillRect(xx - 30, 0, 60, h); x.globalAlpha = 1; x.fillRect(xx - 1, 0, 2, h); }
        else if (target) { x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.7; x.font = "11px " + V.css("--f-mono"); x.fillText("¿DÓNDE ESTÁ EL REALCE? Escuchá antes de mirar.", 10, 18); x.globalAlpha = 1; }
      });
      root.append(
        el("div", { class: "lab-grid" },
          el("div", { class: "stack" },
            el("div", { class: "widget" },
              el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Adiviná la frecuencia"), el("div", { class: "btn-row" }, newBtn)),
              el("div", { class: "body" }, el("div", { class: "btn-row" }, srcSeg, lvlSeg), msg, el("div", { class: "ear-opts" }, btns), el("div", { class: "btn-row" }, eqBtn, play)),
              el("p", { class: "cap" }, "Empezá con ruido rosa: tiene energía en todo el espectro y el realce se escucha como un \"color\". Después pasá a música. Tus aciertos quedan guardados en este navegador.")
            ),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Espectro")), el("div", { class: "body" }, el("div", { class: "screen" }, cv)))
          ),
          el("div", { class: "stack" }, el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Tu marcador")), el("div", { class: "body" }, scoreEl)),
            el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Pistas para reconocer")), el("div", { class: "body" },
              el("table", { class: "data" }, el("tbody", null, V.BANDS.map((b) => el("tr", null, el("td", { style: { borderLeft: "4px solid " + V.css(b.v), fontWeight: 600 } }, b.name), el("td", { class: "mono" }, V.fmtHz(b.from) + "–" + V.fmtHz(b.to)), el("td", null, b.desc))))))))
        )
      );
    },
  };

  // =====================================================================
  // LAB: SÍNTESIS — diseño de sonido para producción
  // =====================================================================
  const PRESETS = [
    { name: "Bajo sub + saw", osc1: { wave: "sine", oct: -1, detune: 0, level: 0.75 }, osc2: { wave: "sawtooth", oct: -1, detune: 0, level: 0.3 }, noise: 0, filter: { type: "lowpass", cutoff: 380, q: 2, env: 0.35 }, fenv: { a: 0.005, d: 0.2, s: 0.2, r: 0.1 }, aenv: { a: 0.005, d: 0.1, s: 0.9, r: 0.08 }, lfo: { rate: 5, depth: 0, target: "pitch", wave: "sine" } },
    { name: "Lead de drop (supersaw)", osc1: { wave: "sawtooth", oct: 0, detune: -14, level: 0.55 }, osc2: { wave: "sawtooth", oct: 0, detune: 14, level: 0.55 }, noise: 0.02, filter: { type: "lowpass", cutoff: 3200, q: 1, env: 0.3 }, fenv: { a: 0.01, d: 0.4, s: 0.5, r: 0.3 }, aenv: { a: 0.01, d: 0.3, s: 0.8, r: 0.35 }, lfo: { rate: 5.5, depth: 0.12, target: "pitch", wave: "sine" } },
    { name: "Pluck", osc1: { wave: "sawtooth", oct: 0, detune: 0, level: 0.6 }, osc2: { wave: "square", oct: 1, detune: 3, level: 0.3 }, noise: 0, filter: { type: "lowpass", cutoff: 450, q: 6, env: 0.8 }, fenv: { a: 0.001, d: 0.22, s: 0, r: 0.2 }, aenv: { a: 0.001, d: 0.45, s: 0, r: 0.3 }, lfo: { rate: 5, depth: 0, target: "pitch", wave: "sine" } },
    { name: "Pad atmosférico", osc1: { wave: "sawtooth", oct: 0, detune: -9, level: 0.45 }, osc2: { wave: "triangle", oct: 1, detune: 9, level: 0.45 }, noise: 0.04, filter: { type: "lowpass", cutoff: 700, q: 1.5, env: 0.25 }, fenv: { a: 1.5, d: 1, s: 0.6, r: 1.5 }, aenv: { a: 1.2, d: 1, s: 0.85, r: 2.2 }, lfo: { rate: 0.25, depth: 0.45, target: "filter", wave: "sine" } },
    { name: "Wobble (dubstep)", osc1: { wave: "sawtooth", oct: -1, detune: 0, level: 0.6 }, osc2: { wave: "square", oct: -1, detune: 6, level: 0.5 }, noise: 0, filter: { type: "lowpass", cutoff: 260, q: 9, env: 0 }, fenv: { a: 0.01, d: 0.3, s: 1, r: 0.2 }, aenv: { a: 0.01, d: 0.2, s: 1, r: 0.15 }, lfo: { rate: 4, depth: 1, target: "filter", wave: "sine" } },
    { name: "Stab de bronces (trap)", osc1: { wave: "sawtooth", oct: 0, detune: -6, level: 0.55 }, osc2: { wave: "sawtooth", oct: 0, detune: 6, level: 0.55 }, noise: 0, filter: { type: "lowpass", cutoff: 900, q: 2, env: 0.55 }, fenv: { a: 0.03, d: 0.25, s: 0.3, r: 0.1 }, aenv: { a: 0.02, d: 0.25, s: 0.15, r: 0.1 }, lfo: { rate: 5, depth: 0, target: "pitch", wave: "sine" } },
    { name: "Riser de ruido", osc1: { wave: "sawtooth", oct: 0, detune: 0, level: 0 }, osc2: { wave: "sawtooth", oct: 1, detune: 0, level: 0.08 }, noise: 0.9, filter: { type: "bandpass", cutoff: 300, q: 3, env: 0.75 }, fenv: { a: 3.5, d: 0.1, s: 1, r: 0.8 }, aenv: { a: 3, d: 0.1, s: 1, r: 0.6 }, lfo: { rate: 5, depth: 0, target: "pitch", wave: "sine" } },
  ];
  const SC_WAVE = { sine: "SinOsc.ar", sawtooth: "Saw.ar", square: "Pulse.ar", triangle: "LFTri.ar" };
  const scSynth = (p) => {
    const f = (n) => +(+n).toFixed(3);
    const vib = p.lfo.target === "pitch" && p.lfo.depth > 0;
    const osc = (o) => SC_WAVE[o.wave] + "(freq" + (vib ? " * vib" : "") + " * " + f(Math.pow(2, o.oct + o.detune / 1200)) + (o.wave === "square" ? ", 0.5" : "") + ") * " + f(o.level);
    const flt = p.filter.type === "lowpass" ? "RLPF" : p.filter.type === "highpass" ? "RHPF" : "BPF";
    const L = [];
    L.push("// Señal Lab: \"" + p.name + "\" como SynthDef de SuperCollider");
    L.push("(");
    L.push("SynthDef(\\senal, { |out = 0, freq = 220, gate = 1, amp = 0.3|");
    L.push("  var lfo = SinOsc.kr(" + f(p.lfo.rate) + ");");
    L.push("  var vib = " + (vib ? "(lfo * " + f(p.lfo.depth) + ").midiratio; // vibrato en semitonos" : "1;"));
    L.push("  var fenv = EnvGen.kr(Env.adsr(" + [p.fenv.a, p.fenv.d, p.fenv.s, p.fenv.r].map(f).join(", ") + "), gate);");
    L.push("  var aenv = EnvGen.kr(Env.adsr(" + [p.aenv.a, p.aenv.d, p.aenv.s, p.aenv.r].map(f).join(", ") + "), gate, doneAction: 2);");
    L.push("  var cutoff = " + f(p.filter.cutoff) + " * (2 ** (fenv * " + f(p.filter.env * 6) + "))" + (p.lfo.target === "filter" && p.lfo.depth > 0 ? " * (2 ** (lfo * " + f(p.lfo.depth * 2) + "))" : "") + ";");
    L.push("  var sig = " + osc(p.osc1));
    L.push("    + (" + osc(p.osc2) + ")" + (p.noise > 0 ? "\n    + (WhiteNoise.ar * " + f(p.noise) + ")" : "") + ";");
    L.push("  sig = " + flt + ".ar(sig, cutoff.clip(20, 18000), " + f(1 / p.filter.q) + ");");
    if (p.lfo.target === "amp" && p.lfo.depth > 0) L.push("  sig = sig * (1 - (lfo.range(0, 1) * " + f(p.lfo.depth * 0.5) + ")); // trémolo");
    L.push("  Out.ar(out, Pan2.ar(sig * aenv * amp));");
    L.push("}).add;");
    L.push(")");
    L.push("");
    L.push("// Tocá una nota y después soltala:");
    L.push("x = Synth(\\senal, [\\freq, 110]);");
    L.push("x.release;");
    return L.join("\n");
  };
  L.keyboard = function (onDown, onUp, opts = {}) {
    const base = opts.base || 48, octs = opts.octaves || 2;
    const kb = el("div", { class: "kbd", role: "group", "aria-label": "Teclado" });
    const KEYS = "awsedftgyhujkolp;'";
    const whites = [], blacks = [];
    const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
    const NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
    const keys = new Map();
    let shift = 0;
    const total = octs * 12 + 1;
    for (let i = 0; i < total; i++) (isBlack(base + i) ? blacks : whites).push(i);
    const ww = 100 / whites.length;
    let wi = 0;
    for (let i = 0; i < total; i++) {
      const m = base + i, black = isBlack(m);
      const k = el("div", { class: "k " + (black ? "b" : "w"), "data-m": m, title: NAMES[m % 12] + (Math.floor(m / 12) - 1) });
      if (black) { k.style.left = "calc(" + wi * ww + "% - " + ww * 0.3 + "%)"; k.style.width = ww * 0.6 + "%"; }
      else { k.style.left = wi * ww + "%"; k.style.width = ww + "%"; wi++; }
      if (i < KEYS.length) k.append(el("span", null, KEYS[i].toUpperCase()));
      kb.append(k); keys.set(m, k);
    }
    const down = (m) => { const k = keys.get(m - shift); if (k) k.classList.add("on"); onDown(m); };
    const up = (m) => { const k = keys.get(m - shift); if (k) k.classList.remove("on"); onUp(m); };
    let ptrNote = null;
    kb.addEventListener("pointerdown", (e) => { const k = e.target.closest(".k"); if (!k) return; kb.setPointerCapture(e.pointerId); ptrNote = +k.dataset.m + shift; down(ptrNote); });
    kb.addEventListener("pointermove", (e) => { if (ptrNote === null) return; const t = document.elementFromPoint(e.clientX, e.clientY); const k = t && t.closest && t.closest(".kbd .k"); if (k && +k.dataset.m + shift !== ptrNote) { up(ptrNote); ptrNote = +k.dataset.m + shift; down(ptrNote); } });
    const end = () => { if (ptrNote !== null) { up(ptrNote); ptrNote = null; } };
    kb.addEventListener("pointerup", end); kb.addEventListener("pointercancel", end);
    const held = new Set();
    const kd = (e) => { if (e.repeat || e.metaKey || e.ctrlKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== "range") return; const i = KEYS.indexOf(e.key.toLowerCase()); if (i < 0 || held.has(i)) return; held.add(i); down(base + i + shift); };
    const ku = (e) => { const i = KEYS.indexOf(e.key.toLowerCase()); if (i < 0 || !held.has(i)) return; held.delete(i); up(base + i + shift); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    S.onLeave(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });
    kb.mark = (set) => keys.forEach((k, m) => { k.style.boxShadow = set && set.has(m % 12) ? "inset 0 -6px 0 " + V.css("--b-pres") : ""; });
    kb.octave = (d) => { shift += d * 12; return shift; };
    return kb;
  };
  L.synth = {
    title: "Diseño de sonido", tag: "Síntesis · SuperCollider", color: "--b-low",
    desc: "Sintetizador sustractivo con osciloscopio, espectro y exportación a SuperCollider.",
    render(root) {
      const c = A.ctx();
      const syn = A.track(new A.Synth(PRESETS[1]));
      const an = V.mkAnalyser(4096, 0.7);
      const delay = c.createDelay(1), fb = c.createGain(), dWet = c.createGain();
      delay.delayTime.value = 0.375; fb.gain.value = 0.3; dWet.gain.value = 0;
      syn.out.connect(an); syn.out.connect(delay); delay.connect(fb).connect(delay); delay.connect(dWet).connect(an);
      an.connect(A.master);
      const P = () => syn.patch;
      const sliders = [];
      const mk = (label, path, o) => { const s = U.slider(Object.assign({ label, value: path.split(".").reduce((a, k) => a[k], P()), onInput: (v) => { syn.set(path, v); sc.refresh(); } }, o)); s.path = path; sliders.push(s); return s; };
      const mkSel = (label, path, options) => { const s = U.select({ label, value: path.split(".").reduce((a, k) => a[k], P()), options, onInput: (v) => { syn.set(path, v); sc.refresh(); } }); s.path = path; sliders.push(s); return s; };
      const WAVES = [["sine", "Senoidal"], ["triangle", "Triangular"], ["sawtooth", "Diente de sierra"], ["square", "Cuadrada"]];
      const sec = (t, col, ...kids) => el("div", { class: "group", style: { "--gc": V.css(col) } }, el("div", { class: "gt" }, el("i"), t), ...kids);
      const tm = { min: 0.001, max: 5, log: true, fmt: (v) => (v < 1 ? Math.round(v * 1000) + " ms" : v.toFixed(2) + " s") };
      const panel = el("div", { class: "controls", style: { gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" } },
        sec("Oscilador 1", "--b-low", mkSel("Forma de onda", "osc1.wave", WAVES), mk("Octava", "osc1.oct", { min: -2, max: 2, step: 1, fmt: (v) => (v > 0 ? "+" : "") + v }), mk("Desafinación", "osc1.detune", { min: -50, max: 50, step: 1, unit: " ct" }), mk("Nivel", "osc1.level", { min: 0, max: 1, step: 0.01 })),
        sec("Oscilador 2 + ruido", "--b-lowmid", mkSel("Forma de onda", "osc2.wave", WAVES), mk("Octava", "osc2.oct", { min: -2, max: 2, step: 1, fmt: (v) => (v > 0 ? "+" : "") + v }), mk("Desafinación", "osc2.detune", { min: -50, max: 50, step: 1, unit: " ct" }), mk("Nivel", "osc2.level", { min: 0, max: 1, step: 0.01 }), mk("Ruido", "noise", { min: 0, max: 1, step: 0.01 })),
        sec("Filtro", "--b-mid", mkSel("Tipo", "filter.type", [["lowpass", "Paso bajo"], ["highpass", "Paso alto"], ["bandpass", "Paso banda"]]), mk("Corte (cutoff)", "filter.cutoff", { min: 40, max: 16000, log: true, fmt: (v) => V.fmtHz(v) + " Hz" }), mk("Resonancia", "filter.q", { min: 0.3, max: 20, log: true, fmt: (v) => v.toFixed(1) }), mk("Envolvente → filtro", "filter.env", { min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + "%" })),
        sec("Envolvente de filtro", "--b-himid", mk("Ataque", "fenv.a", tm), mk("Decaimiento", "fenv.d", tm), mk("Sostenido", "fenv.s", { min: 0, max: 1, step: 0.01 }), mk("Liberación", "fenv.r", tm)),
        sec("Envolvente de amplitud", "--b-pres", mk("Ataque", "aenv.a", tm), mk("Decaimiento", "aenv.d", tm), mk("Sostenido", "aenv.s", { min: 0, max: 1, step: 0.01 }), mk("Liberación", "aenv.r", tm)),
        sec("LFO", "--b-air", mkSel("Destino", "lfo.target", [["pitch", "Afinación (vibrato)"], ["filter", "Filtro (wobble)"], ["amp", "Volumen (trémolo)"]]), mkSel("Forma", "lfo.wave", WAVES), mk("Velocidad", "lfo.rate", { min: 0.05, max: 20, log: true, fmt: (v) => v.toFixed(2) + " Hz" }), mk("Profundidad", "lfo.depth", { min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + "%" }))
      );
      const syncAll = () => sliders.forEach((s) => { const v = s.path.split(".").reduce((a, k) => a[k], P()); s.set(v, true); });
      const preRow = el("div", { class: "btn-row" }, PRESETS.map((p) => el("button", { type: "button", class: "btn sm", onclick: () => { syn.allOff(); syn.patch = JSON.parse(JSON.stringify(Object.assign({}, A.DEFAULT_PATCH, p))); syn.applyLfo(); syncAll(); sc.refresh(); } }, p.name)));

      const scope = V.canvas(150), spec = V.canvas(150), envCv = V.canvas(150);
      const flt = c.createBiquadFilter();
      V.loop(() => {
        let { g: x, w, h } = V.fit(scope, 150);
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        x.strokeStyle = V.css("--screen-grid"); x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
        V.drawScope(x, w, h, an, V.css("--b-low"));
        ({ g: x, w, h } = V.fit(spec, 150));
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        V.freqGrid(x, w, h, { bands: true });
        V.drawSpectrum(x, w, h, an, { fill: true, min: -110, max: -15 });
        flt.type = P().filter.type; flt.frequency.value = P().filter.cutoff; flt.Q.value = P().filter.q;
        drawCurve(x, w, h, response([flt]), 24, V.css("--b-mid"), false);
        ({ g: x, w, h } = V.fit(envCv, 150));
        x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
        const drawEnv = (e, col, y0, hh) => {
          const tot = e.a + e.d + 1 + e.r, sx = (w - 20) / tot; let xx = 10;
          x.beginPath(); x.moveTo(xx, y0 + hh); xx += e.a * sx; x.lineTo(xx, y0); xx += e.d * sx; x.lineTo(xx, y0 + hh * (1 - e.s)); xx += 1 * sx; x.lineTo(xx, y0 + hh * (1 - e.s)); xx += e.r * sx; x.lineTo(xx, y0 + hh);
          x.strokeStyle = col; x.lineWidth = 2.5; x.stroke(); x.lineTo(10, y0 + hh); x.fillStyle = col; x.globalAlpha = 0.15; x.fill(); x.globalAlpha = 1;
        };
        drawEnv(P().aenv, V.css("--b-pres"), 16, h - 30);
        drawEnv(P().fenv, V.css("--b-himid"), 16, h - 30);
        x.font = "10px " + V.css("--f-mono"); x.fillStyle = V.css("--b-pres"); x.fillText("AMPLITUD", 10, 12); x.fillStyle = V.css("--b-himid"); x.fillText("FILTRO", 80, 12);
        x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.6; x.fillText("A · D · S · R", w - 80, 12); x.globalAlpha = 1;
      });
      const kb = L.keyboard((m) => syn.noteOn(m), (m) => syn.noteOff(m), { base: 48, octaves: 2 });
      const FMIN = new Set([5, 7, 8, 10, 0, 1, 3]);
      let showScale = false;
      const scaleBtn = el("button", { type: "button", class: "btn sm" }, "Marcar Fa menor");
      scaleBtn.addEventListener("click", () => { showScale = !showScale; scaleBtn.classList.toggle("on", showScale); kb.mark(showScale ? FMIN : null); });
      const octDn = el("button", { type: "button", class: "btn sm", onclick: () => U.toast("Octava " + kb.octave(-1) / 12) }, "Oct −"), octUp = el("button", { type: "button", class: "btn sm", onclick: () => U.toast("Octava +" + kb.octave(1) / 12) }, "Oct +");
      const phrase = el("button", { type: "button", class: "btn sm", onclick: () => {
        const t0 = c.currentTime + 0.05, sd = 60 / 128 / 4;
        // a 2-bar hook in F minor, narrow range (Swindali: smaller ranges for the drop)
        [[65, 0, 2], [68, 2, 2], [72, 4, 3], [70, 8, 2], [68, 10, 2], [67, 12, 4], [65, 16, 2], [68, 18, 2], [72, 20, 2], [75, 22, 3], [72, 26, 2], [70, 28, 4]]
          .forEach(([m, s, d]) => { const t = t0 + s * sd; setTimeout(() => syn.noteOn(m - (P().osc1.oct < 0 ? 24 : 0)), (t - c.currentTime) * 1000); setTimeout(() => syn.noteOff(m - (P().osc1.oct < 0 ? 24 : 0)), (t + d * sd * 0.9 - c.currentTime) * 1000); });
      } }, "Tocar frase en Fa menor");
      const dly = el("button", { type: "button", class: "btn sm" }, "Delay 3/16");
      dly.addEventListener("click", () => { const on = dWet.gain.value < 0.1; dWet.gain.value = on ? 0.35 : 0; dly.classList.toggle("on", on); });
      const sc = L.codePanel("Ver este sonido como SynthDef de SuperCollider", () => scSynth(P()));

      root.append(
        el("div", { class: "stack" },
          el("div", { class: "widget" },
            el("header", null, el("span", { class: "t" }, el("b", null, "●"), "Sintetizador sustractivo · 2 osciladores"), el("div", { class: "btn-row" }, phrase, dly)),
            el("div", { class: "body" }, preRow,
              el("div", { class: "lab-grid", style: { gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" } },
                el("div", { class: "screen" }, el("span", { class: "hint" }, "Osciloscopio"), scope),
                el("div", { class: "screen" }, el("span", { class: "hint" }, "Espectro + filtro"), spec),
                el("div", { class: "screen" }, envCv)),
              kb, el("div", { class: "btn-row" }, octDn, octUp, scaleBtn, el("span", { class: "eyebrow" }, "Teclas A W S E D F T G Y H U J K del teclado de la compu"))),
            el("p", { class: "cap" }, "Elegí un preset, tocá y después rompelo: cada control se ve en las pantallas. Swindali recomienda escribir primero la melodía y recién después diseñar el sonido; \"Tocar frase\" te da un gancho corto para probar.")
          ),
          el("div", { class: "widget" }, el("header", null, el("span", { class: "t" }, "Panel de control")), el("div", { class: "body" }, panel)),
          sc
        )
      );
    },
  };
})(window.S);
