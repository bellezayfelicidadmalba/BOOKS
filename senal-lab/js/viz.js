/* Señal Lab — dibujo en canvas + controles de UI */
window.S = window.S || {};
(function (S) {
  const V = (S.viz = {});
  const U = (S.ui = {});

  V.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  V.BANDS = [
    { name: "Sub", from: 20, to: 60, v: "--b-sub", desc: "Se siente más de lo que se oye. Bombo, sub-bajo." },
    { name: "Graves", from: 60, to: 250, v: "--b-low", desc: "Cuerpo y pegada del bombo y el bajo." },
    { name: "Medios-graves", from: 250, to: 500, v: "--b-lowmid", desc: "Calidez o barro. Zona \"boxy\" del bombo." },
    { name: "Medios", from: 500, to: 2000, v: "--b-mid", desc: "Cuerpo de voces e instrumentos. Exceso = nasal." },
    { name: "Medios-agudos", from: 2000, to: 4000, v: "--b-himid", desc: "Ataque, inteligibilidad. El oído es más sensible acá." },
    { name: "Presencia", from: 4000, to: 8000, v: "--b-pres", desc: "Definición y cercanía. Exceso = estridente, sibilante." },
    { name: "Aire", from: 8000, to: 20000, v: "--b-air", desc: "Brillo, platillos, \"aire\"." },
  ];
  V.bandFor = (f) => V.BANDS.find((b) => f >= b.from && f < b.to) || V.BANDS[V.BANDS.length - 1];

  // HiDPI canvas
  V.fit = function (cv, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || cv.parentElement.clientWidth || 300;
    const hh = h || cv.clientHeight || 160;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
      if (h) cv.style.height = hh + "px";
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h: hh };
  };
  V.canvas = function (h, cls) {
    const cv = document.createElement("canvas");
    cv.style.height = h + "px"; if (cls) cv.className = cls;
    return cv;
  };

  // animation registry (cancelled on route change)
  const loops = new Set();
  V.loop = function (fn) {
    const o = { alive: true };
    const step = (t) => { if (!o.alive) return; try { fn(t); } catch (e) { console.error(e); o.alive = false; return; } requestAnimationFrame(step); };
    requestAnimationFrame(step); loops.add(o);
    return () => { o.alive = false; loops.delete(o); };
  };
  V.stopAll = () => { loops.forEach((o) => (o.alive = false)); loops.clear(); };

  // frequency mapping (log)
  V.fx = (f, w, lo = 20, hi = 20000) => (Math.log10(f / lo) / Math.log10(hi / lo)) * w;
  V.xf = (x, w, lo = 20, hi = 20000) => lo * Math.pow(hi / lo, x / w);
  V.fmtHz = (f) => (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1).replace(".0", "") + "k" : Math.round(f) + "");

  V.freqGrid = function (g, w, h, opts = {}) {
    g.strokeStyle = V.css("--screen-grid"); g.lineWidth = 1;
    g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 1;
    g.font = "10px " + V.css("--f-mono");
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach((f) => {
      const x = Math.round(V.fx(f, w)) + 0.5;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      if (!opts.noLabels && f > 20 && f < 20000) { g.globalAlpha = 0.55; g.fillText(V.fmtHz(f), x + 3, h - 5); g.globalAlpha = 1; }
    });
    if (opts.bands) {
      V.BANDS.forEach((b) => {
        const x0 = V.fx(b.from, w), x1 = V.fx(b.to, w);
        g.fillStyle = V.css(b.v); g.globalAlpha = 0.9; g.fillRect(x0, 0, x1 - x0 - 1, 3); g.globalAlpha = 1;
      });
    }
  };

  // spectrum from analyser
  V.drawSpectrum = function (g, w, h, an, opts = {}) {
    const n = an.frequencyBinCount;
    if (!an._buf || an._buf.length !== n) an._buf = new Float32Array(n);
    an.getFloatFrequencyData(an._buf);
    const sr = an.context.sampleRate, min = opts.min || -100, max = opts.max || -10;
    g.beginPath();
    let started = false;
    for (let x = 0; x <= w; x += 2) {
      const f = V.xf(x, w), bin = Math.min(n - 1, Math.round((f / (sr / 2)) * n));
      // average neighbours at high freqs
      const span = Math.max(1, Math.round(bin * 0.03));
      let s = -200; for (let k = bin - span; k <= bin + span; k++) if (k >= 0 && k < n) s = Math.max(s, an._buf[k]);
      const y = h - ((Math.max(min, Math.min(max, s)) - min) / (max - min)) * h;
      if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
    }
    g.strokeStyle = opts.color || V.css("--screen-ink"); g.lineWidth = 1.5; g.stroke();
    if (opts.fill) {
      g.lineTo(w, h); g.lineTo(0, h); g.closePath();
      const grad = g.createLinearGradient(0, 0, w, 0);
      V.BANDS.forEach((b) => { grad.addColorStop(Math.min(1, V.fx(Math.sqrt(b.from * b.to), w) / w), V.css(b.v)); });
      g.globalAlpha = opts.alpha || 0.28; g.fillStyle = grad; g.fill(); g.globalAlpha = 1;
    }
  };
  V.drawScope = function (g, w, h, an, color) {
    const n = an.fftSize;
    if (!an._tbuf || an._tbuf.length !== n) an._tbuf = new Float32Array(n);
    an.getFloatTimeDomainData(an._tbuf);
    // trigger on rising zero crossing
    let start = 0;
    for (let i = 1; i < n / 2; i++) if (an._tbuf[i - 1] < 0 && an._tbuf[i] >= 0) { start = i; break; }
    const len = Math.min(n - start, 1024);
    g.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w, y = h / 2 - an._tbuf[start + i] * h * 0.42;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = color || V.css("--screen-ink"); g.lineWidth = 1.6; g.stroke();
  };
  V.rms = function (an) {
    const n = an.fftSize;
    if (!an._tbuf || an._tbuf.length !== n) an._tbuf = new Float32Array(n);
    an.getFloatTimeDomainData(an._tbuf);
    let s = 0, p = 0;
    for (let i = 0; i < n; i++) { const v = an._tbuf[i]; s += v * v; if (Math.abs(v) > p) p = Math.abs(v); }
    return { rms: Math.sqrt(s / n), peak: p };
  };
  V.mkAnalyser = function (fft = 2048, smooth = 0.75) {
    const c = S.audio.ctx(), a = c.createAnalyser(); a.fftSize = fft; a.smoothingTimeConstant = smooth; return a;
  };

  // little static wave icon for cards
  V.waveIcon = function (cv, kind, color) {
    const { g, w, h } = V.fit(cv);
    g.clearRect(0, 0, w, h); g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= w; x++) {
      const p = (x / w) * Math.PI * 4; let y = 0;
      if (kind === 0) y = Math.sin(p);
      else if (kind === 1) y = ((p / Math.PI) % 2) - 1;
      else if (kind === 2) y = Math.sin(p) > 0 ? 0.8 : -0.8;
      else if (kind === 3) y = Math.sin(p) * Math.exp(-x / w * 2.5) * 1.1;
      else if (kind === 4) y = Math.sin(p * 3) * Math.sin(p / 4);
      else if (kind === 5) y = Math.max(-0.6, Math.min(0.6, Math.sin(p) * 1.6));
      else y = Math.sin(p) * 0.5 + Math.sin(p * 2.03) * 0.35;
      const yy = h / 2 - y * h * 0.4; x ? g.lineTo(x, yy) : g.moveTo(x, yy);
    }
    g.stroke();
  };

  // ---------- UI helpers ----------
  let uid = 0;
  U.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "style" && typeof v === "object") { for (const sk in v) sk.startsWith("--") ? e.style.setProperty(sk, v[sk]) : (e.style[sk] = v[sk]); }
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((k) => { if (k == null || k === false) return; e.append(k.nodeType ? k : document.createTextNode(k)); });
    return e;
  };
  const el = U.el;

  U.slider = function (o) {
    const id = o.id || "c" + ++uid;
    const log = !!o.log;
    const toPos = (v) => (log ? (Math.log(v / o.min) / Math.log(o.max / o.min)) * 1000 : v);
    const fromPos = (p) => (log ? o.min * Math.pow(o.max / o.min, p / 1000) : p);
    const input = el("input", { type: "range", id, min: log ? 0 : o.min, max: log ? 1000 : o.max, step: log ? 1 : o.step || 0.01, value: toPos(o.value) });
    const out = el("output", { for: id });
    const fmt = o.fmt || ((v) => (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)) + (o.unit || ""));
    const set = (v, silent) => { input.value = toPos(v); out.textContent = fmt(v); if (!silent && o.onInput) o.onInput(v); };
    input.addEventListener("input", () => { const v = fromPos(+input.value); out.textContent = fmt(v); o.onInput && o.onInput(v); });
    out.textContent = fmt(o.value);
    const wrap = el("div", { class: "ctl" }, el("label", { for: id }, el("span", null, o.label), out), input);
    wrap.set = set; wrap.input = input;
    wrap.get = () => fromPos(+input.value);
    return wrap;
  };
  U.select = function (o) {
    const id = o.id || "c" + ++uid;
    const s = el("select", { id }, o.options.map((op) => el("option", { value: op[0] }, op[1])));
    s.value = o.value;
    s.addEventListener("change", () => o.onInput && o.onInput(s.value));
    const w = el("div", { class: "ctl" }, el("label", { for: id }, el("span", null, o.label)), s);
    w.set = (v) => (s.value = v); w.sel = s;
    return w;
  };
  U.seg = function (options, value, onPick, label) {
    const w = el("div", { class: "seg", role: "group", "aria-label": label || "" });
    const btns = options.map(([v, t]) => {
      const b = el("button", { type: "button", "aria-pressed": String(v === value) }, t);
      b.addEventListener("click", () => { btns.forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onPick(v); });
      return b;
    });
    w.append(...btns);
    w.set = (v) => btns.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i][0] === v)));
    return w;
  };
  U.icon = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" fill="currentColor"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
    back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H4M7.5 4l-4 4 4 4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  };
  U.playBtn = function (label, onToggle, cls) {
    const b = el("button", { type: "button", class: "btn " + (cls || "primary") });
    let on = false;
    const render = () => { b.innerHTML = (on ? U.icon.stop : U.icon.play) + "<span>" + (on ? "Detener" : label) + "</span>"; b.classList.toggle("on", on && cls !== "primary"); };
    b.addEventListener("click", () => { on = onToggle(!on) !== false ? !on : on; render(); });
    b.setOn = (v) => { on = v; render(); };
    render();
    return b;
  };
  U.toast = function (msg) {
    const t = el("div", { class: "toast", role: "status" }, msg);
    document.body.append(t); setTimeout(() => t.remove(), 2200);
  };
  U.store = {
    get(k, d) { try { const v = localStorage.getItem("senal:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("senal:" + k, JSON.stringify(v)); } catch (e) {} },
  };
  U.copy = function (text, btn) {
    const done = () => U.toast("Copiado al portapapeles");
    try { navigator.clipboard.writeText(text).then(done, () => U.toast("Seleccioná el código y copialo a mano")); }
    catch (e) { U.toast("Seleccioná el código y copialo a mano"); }
  };
})(window.S);
