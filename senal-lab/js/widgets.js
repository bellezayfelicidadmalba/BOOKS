/* Señal Lab — figuras interactivas dentro de las lecciones */
window.S = window.S || {};
(function (S) {
  const W = (S.widgets = {});
  const { el } = S.ui, U = S.ui, A = S.audio, V = S.viz, C = S.content;

  const box = (title, body, cap, actions) => el("figure", { class: "widget figure" },
    el("header", null, el("span", { class: "t" }, el("b", null, "●"), title), actions ? el("div", { class: "btn-row" }, actions) : null),
    el("div", { class: "body" }, body), cap ? el("figcaption", { class: "cap" }, cap) : null);
  // only one groove at a time across widgets
  let current = null;
  const exclusive = (stopFn) => { if (current && current !== stopFn) current(); current = stopFn; };
  const scr = (cv, hint) => el("div", { class: "screen" }, hint ? el("span", { class: "hint" }, hint) : null, cv);
  const grooveFor = (genre, lead) => { const g = A.track(new A.Groove({ bpm: genre ? genre.bpm : 124, lead: !!lead })); g.pattern = S.labs.patternFrom(genre || S.labs.GENRES[0]); if (lead) g.mutes = {}; return g; };

  // ---------------------------------------------------------------
  W.producerDial = function () {
    const ST = [
      ["Artista", "Se produce a sí mismo. Burgess dice que es una categoría que crece por la democratización de la grabación digital: en sus clases, buena parte de los alumnos se identifica acá.", "Les Paul, Stevie Wonder, Prince; Gotye y Calvin Harris con hits propios."],
      ["Auteur", "La fuerza creativa principal es el productor, y se nota: muchas veces compone, arregla, graba guías y hasta mezcla. Tiene un sello sonoro reconocible aunque el artista sea desconocido.", "Ideal para artistas que no componen o necesitan coautor. No tanto para una banda que quiere tocar todo."],
      ["Facilitativo", "Suele venir de la ingeniería, la programación o la música, y figura como coproductor. El artista es la fuerza creativa; el productor sostiene, facilita y maximiza sus ideas sin buscar protagonismo.", "Funciona con artistas seguros y autodirigidos que necesitan a alguien que haga avanzar el proceso."],
      ["Colaborativo", "Comparte la carga creativa como un coautor de un libro o un guion. El resultado tiene una identidad fresca: no es del todo la del artista ni la del productor.", "Burgess observa que muchísimos productores se describen así."],
      ["Habilitador", "Crea las condiciones para que una grabación ocurra: encontrar talento, material y el entorno. Es el modo histórico de producir, de cuando todo se grababa en una sola toma simultánea.", "Antes de la cinta magnética, el arte de producir era sobre todo este."],
      ["Consultivo", "Un mentor con mirada de altura y oídos frescos. Puede pasar poco tiempo en el estudio, pero aconseja, guía y alinea la visión del proyecto.", "Rick Rubin: \"Mi objetivo es correrme del camino y dejar que las personas con las que trabajo den lo mejor de sí\"."],
    ];
    let pos = 0.5;
    const cv = V.canvas(110);
    const name = el("h4", { style: { margin: 0, fontFamily: "var(--f-display)", fontSize: "30px", textTransform: "uppercase", lineHeight: 1 } });
    const d1 = el("p", { style: { margin: 0, fontSize: "15px" } }), d2 = el("p", { style: { margin: 0, fontSize: "14px", color: "var(--muted)" } });
    const idx = () => Math.round(pos * (ST.length - 1));
    const update = () => { const s = ST[idx()]; name.textContent = s[0]; d1.textContent = s[1]; d2.textContent = s[2]; };
    const draw = () => {
      const { g, w, h } = V.fit(cv, 110);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const x0 = 30, x1 = w - 30;
      for (let i = 0; i <= 60; i++) { const x = x0 + (i / 60) * (x1 - x0); g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 0.3; g.fillRect(x, 40, 1, i % 5 ? 8 : 14); }
      g.globalAlpha = 1; g.font = "600 11px " + V.css("--f-mono"); g.textAlign = "center";
      ST.forEach((s, i) => {
        const x = x0 + (i / (ST.length - 1)) * (x1 - x0);
        const on = i === idx();
        g.fillStyle = on ? V.css("--accent") : V.css("--screen-ink"); g.globalAlpha = on ? 1 : 0.6;
        g.fillText(s[0].toUpperCase(), x, 26);
        g.beginPath(); g.arc(x, 72, on ? 6 : 3, 0, 7); g.fill();
      });
      g.globalAlpha = 1;
      const nx = x0 + pos * (x1 - x0);
      g.fillStyle = V.css("--hot"); g.fillRect(nx - 1, 34, 3, 60);
      g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 0.5; g.font = "10px " + V.css("--f-mono");
      g.textAlign = "left"; g.fillText("← mentor con mirada externa", x0, h - 6); g.textAlign = "right"; g.fillText("el artista se produce solo →", x1, h - 6); g.textAlign = "left"; g.globalAlpha = 1;
    };
    // Burgess draws the continuum with the consultative producer on the left and the self-producing artist on the right
    ST.reverse();
    const set = (e) => { const r = cv.getBoundingClientRect(); pos = Math.max(0, Math.min(1, (e.clientX - r.left - 30) / (r.width - 60))); update(); draw(); };
    let dragging = false;
    cv.addEventListener("pointerdown", (e) => { dragging = true; cv.setPointerCapture(e.pointerId); set(e); });
    cv.addEventListener("pointermove", (e) => dragging && set(e));
    cv.addEventListener("pointerup", () => { dragging = false; pos = idx() / (ST.length - 1); draw(); });
    cv.style.cursor = "ew-resize"; cv.tabIndex = 0; cv.setAttribute("aria-label", "Dial de tipologías de productor. Usá las flechas.");
    cv.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { pos = Math.max(0, Math.min(1, (idx() + (e.key === "ArrowRight" ? 1 : -1)) / (ST.length - 1))); update(); draw(); e.preventDefault(); } });
    update(); requestAnimationFrame(draw); window.addEventListener("resize", draw);
    S.onLeave(() => window.removeEventListener("resize", draw));
    return box("Las seis tipologías de Burgess · sintonizá el dial", el("div", { style: { display: "grid", gap: "12px" } }, scr(cv), name, d1, d2), "Arrastrá la aguja (o usá las flechas). Burgess dibuja este continuo con el productor consultivo a la izquierda y el artista que se autoproduce a la derecha.");
  };

  // ---------------------------------------------------------------
  W.stages = function () {
    const ST = [
      ["Composición", "La canción: armonía, melodía, letra, gancho. Burgess y Rick Rubin coinciden en que el material importa más que los sonidos.", "--b-sub"],
      ["Arreglo", "Qué instrumentos suenan, cuándo, y en qué orden van las secciones. Swindali: un buen balance empieza con un buen arreglo.", "--b-low"],
      ["Grabación", "Capturar las interpretaciones. Burgess: grabá siempre, aunque sea una pasada de prueba; y dejá headroom.", "--b-lowmid"],
      ["Edición", "Comping, timing, afinación, limpieza de ruidos. En MIDI: cuantizar y \"humanizar\".", "--b-mid"],
      ["Mezcla", "Balance, frecuencia, panorama, profundidad, dinámica e interés. Optimizar lo grabado, no rescatarlo.", "--b-himid"],
      ["Mastering", "Procesar la mezcla completa para que compita con temas comerciales del género. EQ, compresión y limitación.", "--b-air"],
    ];
    let cur = 0;
    const detail = el("p", { style: { margin: 0, fontSize: "15.5px" } });
    const row = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "6px" } });
    const btns = ST.map(([n, d, c], i) => {
      const b = el("button", { type: "button", class: "btn", style: { justifyContent: "flex-start", borderTop: "4px solid " + V.css(c), flexDirection: "column", alignItems: "flex-start", gap: "2px" } }, el("span", { class: "eyebrow" }, "Etapa " + (i + 1)), el("span", { style: { fontFamily: "var(--f-display)", fontSize: "20px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0 } }, n));
      b.addEventListener("click", () => { cur = i; paint(); });
      return b;
    });
    row.append(...btns);
    const paint = () => { btns.forEach((b, i) => b.classList.toggle("on", i === cur)); detail.innerHTML = "<strong>" + ST[cur][0] + ".</strong> " + ST[cur][1]; };
    paint();
    return box("Las seis etapas según Swindali", el("div", { style: { display: "grid", gap: "12px" } }, row, detail), "Tocá cada etapa. Cada una resuelve lo suyo: lo que se patea a la siguiente se paga caro.");
  };

  // ---------------------------------------------------------------
  W.ingredients = function () {
    const I = [["Canción", "El material. Benny Blanco: tiene que enganchar en los primeros 10 segundos."], ["Voz", "La interpretación vocal que vende la canción."], ["Arreglo", "Orquestación y forma: qué suena y en qué orden."], ["Interpretación", "\"Si querés un gran sonido de guitarra, conseguí un gran guitarrista.\""], ["Ingeniería", "\"Las grandes canciones merecen un gran sonido.\""], ["Mezcla", "Optimizar lo grabado."], ["Actualidad", "Que suene a su tiempo."], ["Corazón", "Lo que no se mide: emoción, verdad."]];
    const list = el("div", { style: { display: "grid", gap: "5px" } });
    I.forEach(([n, d], i) => {
      const wpct = 100 - i * 10;
      list.append(el("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "2px" } },
        el("div", { style: { background: "color-mix(in srgb, var(--accent) " + (90 - i * 9) + "%, var(--panel))", width: wpct + "%", padding: "6px 10px", borderRadius: "3px", color: i < 4 ? "var(--accent-ink)" : "var(--ink)", display: "flex", gap: "10px", alignItems: "baseline" } },
          el("b", { style: { fontFamily: "var(--f-mono)", fontSize: "12px" } }, String(i + 1)), el("span", { style: { fontWeight: 600 } }, n)),
        el("span", { style: { fontSize: "13px", color: "var(--muted)", paddingLeft: "10px" } }, d)));
    });
    return box("Los ingredientes de un hit, en orden (Burgess, cap. 4)", list, "La mezcla aparece sexta. Cuando un tema no funciona, el problema casi nunca está en el plugin.");
  };

  // ---------------------------------------------------------------
  W.tone = function () {
    const c = () => A.ctx();
    let osc = null, gn = null, f = 440, vol = 0.15;
    const NOTE = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
    const info = el("div", { class: "stat-row" });
    const cv = V.canvas(150);
    const paint = () => {
      const m = Math.round(69 + 12 * Math.log2(f / 440)); const bd = V.bandFor(f);
      info.replaceChildren(
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Frecuencia"), el("div", { class: "big-read", style: { fontSize: "28px" } }, V.fmtHz(f) + " Hz")),
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Nota más cercana"), el("div", { class: "big-read", style: { fontSize: "28px" } }, NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1))),
        el("div", { class: "stat" }, el("div", { class: "eyebrow" }, "Longitud de onda"), el("div", { class: "big-read", style: { fontSize: "28px" } }, (343 / f >= 1 ? (343 / f).toFixed(2) + " m" : ((343 / f) * 100).toFixed(1) + " cm"))),
        el("div", { class: "stat", style: { borderColor: V.css(bd.v) } }, el("div", { class: "eyebrow" }, "Zona"), el("div", { class: "big-read", style: { fontSize: "28px", color: V.css(bd.v) } }, bd.name)));
    };
    const draw = () => {
      const { g, w, h } = V.fit(cv, 150);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      V.freqGrid(g, w, h, { bands: true });
      // wave: show cycles proportional to log freq so it reads at any width
      const cycles = 1 + Math.log2(f / 20) * 1.6;
      g.beginPath(); for (let x = 0; x <= w; x++) { const y = h / 2 - Math.sin((x / w) * cycles * Math.PI * 2) * (h * 0.28); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = V.css(V.bandFor(f).v); g.lineWidth = 2; g.globalAlpha = 0.85; g.stroke(); g.globalAlpha = 1;
      const xf = V.fx(f, w); g.fillStyle = "#fff"; g.fillRect(xf - 1, 0, 3, h);
    };
    const sl = U.slider({ label: "Frecuencia", min: 20, max: 20000, log: true, value: f, fmt: (v) => V.fmtHz(v) + " Hz", onInput: (v) => { f = v; if (osc) osc.frequency.setTargetAtTime(f, c().currentTime, 0.01); paint(); draw(); } });
    const vs = U.slider({ label: "Volumen", min: 0, max: 0.4, step: 0.01, value: vol, fmt: (v) => Math.round(v * 250) + "%", onInput: (v) => { vol = v; if (gn) gn.gain.setTargetAtTime(v, c().currentTime, 0.02); } });
    const stop = () => { if (osc) { gn.gain.setTargetAtTime(0, c().currentTime, 0.02); osc.stop(c().currentTime + 0.1); osc = null; } };
    A.track({ stop });
    const play = U.playBtn("Escuchar tono", (on) => { if (on) { exclusive(() => { stop(); play.setOn(false); }); osc = c().createOscillator(); gn = c().createGain(); gn.gain.value = 0; osc.frequency.value = f; osc.connect(gn).connect(A.master); osc.start(); gn.gain.setTargetAtTime(vol, c().currentTime, 0.03); } else stop(); });
    const jumps = el("div", { class: "btn-row" }, [[40, "Sub 40 Hz"], [100, "Bombo 100 Hz"], [440, "La 440"], [2500, "Sensibilidad 2,5k"], [8000, "Aire 8k"], [15000, "15k"]].map(([v, t]) => el("button", { type: "button", class: "btn sm", onclick: () => sl.set(v) }, t)));
    paint(); requestAnimationFrame(draw);
    return box("Generador de tonos", el("div", { style: { display: "grid", gap: "12px" } }, scr(cv), info, el("div", { class: "controls" }, sl, vs), jumps), "Bajá el volumen antes de ir a los extremos. Si no escuchás 15 kHz, es normal: el oído pierde agudos con la edad. Los graves profundos casi no salen por parlantes chicos.", play);
  };

  // ---------------------------------------------------------------
  W.systems = function () {
    const SYS = {
      flat: { n: "Monitores", hp: 10, ls: 0, pk: [1000, 0], hs: 0, lp: 20000, mono: 0 },
      laptop: { n: "Laptop", hp: 380, ls: 0, pk: [2400, 5], hs: 0, lp: 13000, mono: 0.5 },
      phone: { n: "Celular", hp: 650, ls: 0, pk: [3000, 6], hs: -3, lp: 9000, mono: 1 },
      buds: { n: "Auriculares baratos", hp: 110, ls: -2, pk: [3500, 3], hs: 4, lp: 16000, mono: 0 },
      car: { n: "Auto", hp: 35, ls: 7, pk: [800, -2], hs: 1, lp: 12000, mono: 0.75 },
      club: { n: "Club (mono)", hp: 30, ls: 5, pk: [3000, 2], hs: 0, lp: 16000, mono: 1 },
    };
    let g = null, cur = "flat", nodes = null;
    const an = { a: null };
    const cv = V.canvas(170);
    const build = () => {
      const c = A.ctx();
      g = grooveFor(S.labs.GENRES[0], true);
      const mk = (t) => { const f = c.createBiquadFilter(); f.type = t; return f; };
      const hp = mk("highpass"), ls = mk("lowshelf"), pk = mk("peaking"), hs = mk("highshelf"), lp = mk("lowpass");
      ls.frequency.value = 90; hs.frequency.value = 6000; pk.Q.value = 1;
      // stereo-ish: pan hats/lead so mono collapse is audible
      const p1 = c.createStereoPanner(); p1.pan.value = 0.7; g.insert("hat", p1, p1);
      const p2 = c.createStereoPanner(); p2.pan.value = -0.6; g.insert("lead", p2, p2);
      const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2), sum = c.createGain(), dir = c.createGain(), monoG = c.createGain(); sum.gain.value = 0.5;
      g.out.connect(hp).connect(ls).connect(pk).connect(hs).connect(lp);
      lp.connect(dir); lp.connect(split); split.connect(sum, 0); split.connect(sum, 1); sum.connect(monoG); monoG.connect(merge, 0, 0); monoG.connect(merge, 0, 1);
      const out = c.createGain(); dir.connect(out); merge.connect(out);
      an.a = V.mkAnalyser(4096, 0.82); out.connect(an.a).connect(A.master);
      nodes = { hp, ls, pk, hs, lp, dir, monoG };
    };
    const apply = () => { if (!nodes) return; const s = SYS[cur], t = A.ctx().currentTime, n = nodes; n.hp.frequency.setTargetAtTime(s.hp, t, 0.02); n.ls.gain.setTargetAtTime(s.ls, t, 0.02); n.pk.frequency.setTargetAtTime(s.pk[0], t, 0.02); n.pk.gain.setTargetAtTime(s.pk[1], t, 0.02); n.hs.gain.setTargetAtTime(s.hs, t, 0.02); n.lp.frequency.setTargetAtTime(s.lp, t, 0.02); n.dir.gain.setTargetAtTime(1 - s.mono, t, 0.02); n.monoG.gain.setTargetAtTime(s.mono, t, 0.02); };
    const seg = U.seg(Object.keys(SYS).map((k) => [k, SYS[k].n]), "flat", (k) => { cur = k; apply(); }, "Sistema de escucha");
    const play = U.playBtn("Escuchar", (on) => { if (on) { exclusive(() => { g && g.stop(); play.setOn(false); }); if (!g) build(); apply(); g.start(); } else g.stop(); });
    V.loop(() => {
      const { g: x, w, h } = V.fit(cv, 170);
      x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
      V.freqGrid(x, w, h, { bands: true });
      if (an.a) V.drawSpectrum(x, w, h, an.a, { fill: true, min: -105, max: -20 });
      const s = SYS[cur];
      x.fillStyle = V.css("--hot"); x.globalAlpha = 0.18;
      x.fillRect(0, 0, V.fx(Math.max(20, s.hp), w), h); x.fillRect(V.fx(s.lp, w), 0, w, h); x.globalAlpha = 1;
      x.fillStyle = V.css("--screen-ink"); x.font = "11px " + V.css("--f-mono"); x.fillText(s.n.toUpperCase() + (s.mono >= 1 ? " · MONO" : ""), 10, 18);
    });
    return box("¿Cómo suena tu mezcla afuera del estudio?", el("div", { style: { display: "grid", gap: "12px" } }, seg, scr(cv)), "Simulación aproximada. Las zonas rojas son lo que ese sistema casi no reproduce. Fijate qué pasa con el hi-hat y el lead (paneados) en el celular y el club.", play);
  };

  // ---------------------------------------------------------------
  W.spl = function () {
    const R = [
      [75, 75, "Desde ~75 dB SPL la exposición larga genera fatiga (Swindali)", "--b-mid"],
      [80, 90, "Trabajo normal: 10–15 min y 5 de descanso (Rogers)", "--b-lowmid"],
      [85, 85, "Primera pasada de mastering (Rogers)", "--b-low"],
      [90, 90, "Segunda pasada, con oídos frescos (Rogers)", "--b-himid"],
      [100, 105, "Chequeo final: solo 3–5 segundos por vez (Rogers)", "--b-pres"],
      [105, 105, "OSHA: no más de 1 hora; Rogers nunca pasa de 20 min", "--hot"],
    ];
    const lo = 60, hi = 110;
    const rows = el("div", { style: { display: "grid", gap: "8px" } });
    R.forEach(([a, b, t, col]) => {
      const l = ((a - lo) / (hi - lo)) * 100, wd = Math.max(1.6, ((b - a) / (hi - lo)) * 100);
      rows.append(el("div", { style: { display: "grid", gap: "3px" } },
        el("div", { style: { fontSize: "13.5px" } }, el("b", { class: "mono", style: { marginRight: "8px" } }, a === b ? a + " dB" : a + "–" + b + " dB"), t),
        el("div", { style: { position: "relative", height: "12px", background: "var(--panel-2)", borderRadius: "6px" } },
          el("i", { style: { position: "absolute", left: l + "%", width: wd + "%", top: 0, bottom: 0, background: V.css(col), borderRadius: "6px" } }))));
    });
    const axis = el("div", { class: "mono", style: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)" } }, [60, 70, 80, 90, 100, 110].map((d) => el("span", null, d)));
    return box("Niveles de escucha (dB SPL)", el("div", { style: { display: "grid", gap: "10px" } }, rows, axis), "Un medidor de SPL en el celular alcanza para orientarte. La regla de Rogers: lo fuerte se escucha de a segundos, no de a minutos.");
  };

  // ---------------------------------------------------------------
  W.kick = function () {
    const NOTE = ["La", "La#", "Si", "Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#"];
    const st = { click: true, body: true, tail: true, semi: 0, len: 0.45 };
    const tailF = () => 55 * Math.pow(2, st.semi / 12);
    const cv = V.canvas(170);
    const synth = (t) => {
      const c = A.ctx(), dest = A.master, f1 = tailF();
      if (st.body || st.tail) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(st.body ? 170 : f1, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.11);
        const a0 = st.body ? 1 : 0.0001, a1 = st.tail ? 0.6 : 0.0001;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(st.body ? 1 : 0.6, t + 0.004);
        g.gain.exponentialRampToValueAtTime(Math.max(a1, 0.0002), t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0005, t + (st.tail ? st.len : 0.16));
        if (!st.body) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.setValueAtTime(0.0001, t + 0.12); g.gain.exponentialRampToValueAtTime(0.6, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0005, t + st.len); }
        o.connect(g).connect(dest); o.start(t); o.stop(t + st.len + 0.1);
      }
      if (st.click) { const n = A.noise(), hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = "highpass"; hp.frequency.value = 2500; ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012); n.connect(hp).connect(ng).connect(dest); n.start(t); n.stop(t + 0.03); }
    };
    const draw = () => {
      const { g, w, h } = V.fit(cv, 170);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const T = 0.6, sr = 6000, n = Math.floor(T * sr), f1 = tailF();
      const tx = (t) => (t / T) * w;
      [[0, 0.01, "--b-air", "CLICK"], [0.01, 0.15, "--b-pres", "CUERPO"], [0.15, T, "--b-sub", "COLA"]].forEach(([a, b, col, lab]) => {
        g.fillStyle = V.css(col); g.globalAlpha = 0.14; g.fillRect(tx(a), 0, tx(b) - tx(a), h); g.globalAlpha = 0.8; g.font = "10px " + V.css("--f-mono"); g.fillText(lab, tx(a) + 4, lab === "CLICK" ? 28 : 14); g.globalAlpha = 1;
      });
      let ph = 0; g.beginPath();
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const fr = st.body ? f1 + (170 - f1) * Math.exp(-t / 0.035) : f1;
        ph += (2 * Math.PI * fr) / sr;
        let env = t < 0.004 ? t / 0.004 : t < 0.15 ? Math.exp(-(t - 0.004) * 3.4) : Math.exp(-0.5) * Math.exp(-(t - 0.15) * (6 / Math.max(0.1, st.len - 0.15)));
        if (!st.body && t < 0.15) env = t < 0.12 ? 0 : 0.6;
        if (!st.tail && t >= 0.15) env = 0;
        let y = Math.sin(ph) * env;
        if (st.click && t < 0.012) y += (Math.random() * 2 - 1) * 0.6 * (1 - t / 0.012);
        const x = tx(t), yy = h / 2 - y * h * 0.4;
        i ? g.lineTo(x, yy) : g.moveTo(x, yy);
      }
      g.strokeStyle = V.css("--screen-ink"); g.lineWidth = 1.2; g.stroke();
      g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 0.6; g.fillText("0", 2, h - 4); g.fillText("600 ms", w - 44, h - 4); g.globalAlpha = 1;
    };
    const tog = (k, label) => { const b = el("button", { type: "button", class: "btn sm on" }, label); b.addEventListener("click", () => { st[k] = !st[k]; b.classList.toggle("on", st[k]); draw(); synth(A.ctx().currentTime + 0.02); }); return b; };
    const noteLbl = () => { const i = ((st.semi % 12) + 12) % 12; return NOTE[i] + " · " + tailF().toFixed(1) + " Hz"; };
    const tune = U.slider({ label: "Afinación de la cola", min: -5, max: 5, step: 1, value: 0, fmt: (v) => (v > 0 ? "+" : "") + v + " st · " + noteLbl(), onInput: (v) => { st.semi = v; draw(); } });
    const len = U.slider({ label: "Largo de la cola", min: 0.2, max: 1, step: 0.01, value: st.len, fmt: (v) => Math.round(v * 1000) + " ms", onInput: (v) => { st.len = v; draw(); } });
    const hit = el("button", { type: "button", class: "btn primary", onclick: () => synth(A.ctx().currentTime + 0.02) }, "Golpe");
    const withBass = el("button", { type: "button", class: "btn sm", onclick: () => { const c = A.ctx(), t = c.currentTime + 0.05; for (let i = 0; i < 4; i++) { synth(t + i * 0.47); A.voices.bass(A.master, t + i * 0.47 + 0.235, 45, 0.2); } } }, "Con bajo en La");
    requestAnimationFrame(draw);
    return box("Anatomía de un bombo", el("div", { style: { display: "grid", gap: "12px" } }, scr(cv), el("div", { class: "btn-row" }, tog("click", "Click"), tog("body", "Cuerpo"), tog("tail", "Cola"), withBass), el("div", { class: "controls" }, tune, len)), "Apagá partes y escuchá qué aporta cada una. El tema de ejemplo está en La menor: con la cola en La (0 st), bombo y bajo se funden. Movela ±5 semitonos con \"Con bajo en La\" y escuchá el choque.", hit);
  };

  // ---------------------------------------------------------------
  W.bpm = function () {
    const G = S.labs.GENRES.map((g) => { const [a, b] = g.range.split("–").map(Number); return Object.assign({}, g, { lo: a, hi: b }); });
    let playing = null, gr = null;
    const lo = 120, hi = 185;
    const rows = el("div", { style: { display: "grid", gap: "6px" } });
    const btns = [];
    G.forEach((g, i) => {
      const l = ((g.lo - lo) / (hi - lo)) * 100, wd = ((g.hi - g.lo) / (hi - lo)) * 100;
      const col = V.css(["--b-sub", "--b-low", "--b-lowmid", "--b-mid", "--b-himid", "--b-pres", "--b-air", "--accent"][i]);
      const b = el("button", { type: "button", style: { display: "grid", gridTemplateColumns: "130px minmax(0, 1fr)", gap: "10px", alignItems: "center", background: "none", border: 0, padding: "2px 0", cursor: "pointer", textAlign: "left" } },
        el("span", { style: { fontSize: "13.5px", fontWeight: 600 } }, g.name),
        el("span", { style: { position: "relative", height: "22px", background: "var(--panel-2)", borderRadius: "4px" } },
          el("i", { style: { position: "absolute", left: l + "%", width: Math.max(wd, 2) + "%", top: 0, bottom: 0, background: col, borderRadius: "4px" } }),
          el("span", { class: "mono", style: { position: "absolute", left: "calc(" + (l + wd) + "% + 6px)", top: "3px", fontSize: "11px", whiteSpace: "nowrap" } }, g.range)));
      b.addEventListener("click", () => {
        if (playing === i) { gr.stop(); playing = null; paint(); return; }
        exclusive(() => { gr && gr.stop(); playing = null; paint(); });
        if (gr) gr.dispose();
        gr = grooveFor(g, false); gr.connect(A.master); gr.mutes = { lead: true }; gr.start(); playing = i; paint();
      });
      btns.push(b); rows.append(b);
    });
    const paint = () => btns.forEach((b, i) => { b.style.outline = playing === i ? "2px solid var(--ink)" : "none"; b.setAttribute("aria-pressed", String(playing === i)); });
    const axis = el("div", { class: "mono", style: { display: "grid", gridTemplateColumns: "130px minmax(0, 1fr)", gap: "10px", fontSize: "11px", color: "var(--muted)" } }, el("span"), el("span", { style: { display: "flex", justifyContent: "space-between" } }, [120, 130, 140, 150, 160, 170, 180].map((d) => el("span", null, d))));
    return box("BPM por género (Swindali)", el("div", { style: { display: "grid", gap: "8px" } }, rows, axis), "Tocá un género para escuchar un patrón típico a su tempo; tocalo de nuevo para frenar. Fijate que trap y dubstep comparten tempo con trance, pero la caja cae en otro lugar.");
  };

  // ---------------------------------------------------------------
  W.variation = function () {
    let g = null, cur = -1;
    const cells = [];
    const strip = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: "4px" } });
    for (let b = 0; b < 8; b++) {
      const tags = [];
      if (b % 2 === 1) tags.push(["golpe nuevo", "--b-himid"]);
      if (b % 4 === 3) tags.push(["más fuerte", "--b-pres"]);
      if (b === 7) tags.push(["fill", "--hot"]);
      const c = el("div", { style: { border: "1px solid var(--line)", borderRadius: "4px", padding: "6px", minHeight: "86px", display: "grid", alignContent: "start", gap: "3px" } }, el("b", { class: "mono", style: { fontSize: "12px" } }, "C" + (b + 1)), tags.map(([t, col]) => el("span", { style: { fontSize: "10.5px", fontFamily: "var(--f-mono)", background: V.css(col), color: "#fff", borderRadius: "3px", padding: "1px 4px" } }, t)));
      cells.push(c); strip.append(c);
    }
    const paint = () => cells.forEach((c, i) => (c.style.background = i === cur ? "var(--panel-2)" : "transparent"));
    const run = () => {
      const c = A.ctx();
      g = grooveFor(S.labs.GENRES[0], false); g.connect(A.master); g.mutes = { lead: true, pad: true };
      g.onBar = (bar, t, bd) => {
        const b = bar % 8, sd = bd / 16, B = g.buses;
        if (b % 2 === 1) { A.voices.hat(B.hat, t + 14 * sd, 1, true); A.voices.clap(B.clap, t + 15 * sd, 0.5); }
        if (b % 4 === 3) { const n = A.noise(), hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = "highpass"; hp.frequency.value = 5000; ng.gain.setValueAtTime(0.25, t + bd); ng.gain.exponentialRampToValueAtTime(0.001, t + bd + 1.4); n.connect(hp).connect(ng).connect(B.fx); n.start(t + bd); n.stop(t + bd + 1.5); }
        if (b === 7) for (let s = 8; s < 16; s++) A.voices.snare(B.fx, t + s * sd, 0.35 + (s - 8) * 0.08);
        setTimeout(() => { cur = b; paint(); }, Math.max(0, (t - c.currentTime) * 1000));
      };
      g.start();
    };
    const play = U.playBtn("Escuchar 8 compases", (on) => { if (on) { exclusive(() => { g && g.stop(); cur = -1; paint(); play.setOn(false); }); if (g) g.dispose(); run(); } else { g.stop(); cur = -1; paint(); } });
    return box("La regla 2 · 4 · 8", strip, "En el compás 4 entra un crash para marcar el bloque, y en el 8 un redoble que anuncia la vuelta. Es poco, pero alcanza para que el loop no aburra.", play);
  };

  // ---------------------------------------------------------------
  W.timeline = function () {
    const cv = V.canvas(150);
    const draw = () => {
      const { g, w, h } = V.fit(cv, 150);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const T = 225, tx = (s) => 12 + (s / T) * (w - 24);
      g.fillStyle = V.css("--b-lowmid"); g.globalAlpha = 0.2; g.fillRect(tx(150), 0, tx(210) - tx(150), h); g.globalAlpha = 1;
      g.strokeStyle = V.css("--screen-grid"); g.font = "10px " + V.css("--f-mono"); g.fillStyle = V.css("--screen-ink");
      for (let s = 0; s <= T; s += 15) { const x = tx(s); g.globalAlpha = s % 60 ? 0.3 : 0.8; g.fillRect(x, h - 26, 1, s % 60 ? 6 : 12); if (s % 30 === 0) g.fillText(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"), x - 10, h - 6); }
      g.globalAlpha = 1;
      const mark = (s, label, col, y) => { const x = tx(s); g.fillStyle = V.css(col); g.fillRect(x - 1, y, 2, h - 28 - y); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.font = "600 11px " + V.css("--f-mono"); g.fillText(label, Math.min(x + 6, w - g.measureText(label).width - 6), y + 4); };
      mark(10, "10 s: enganchar (Benny Blanco)", "--b-air", 18);
      mark(15, "intro < 15 s", "--b-pres", 40);
      mark(30, "30 s: el oyente decide", "--b-himid", 62);
      mark(60, "primer estribillo < 1:00", "--accent", 84);
      g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 0.75; g.font = "10px " + V.css("--f-mono"); g.fillText("DURACIÓN TÍPICA 2:30–3:30", tx(150) + 4, 14); g.fillText("después del minuto: cambios cada 4 compases →", tx(64), 108); g.globalAlpha = 1;
    };
    requestAnimationFrame(draw); window.addEventListener("resize", draw); S.onLeave(() => window.removeEventListener("resize", draw));
    return box("Anatomía de un hit (Swindali, cap. 6; Burgess, cap. 4)", scr(cv), "Son guías sacadas del análisis de listas de éxitos, no leyes. En la electrónica de club la intro es más larga porque está pensada para el DJ.");
  };

  // ---------------------------------------------------------------
  W.energy = function () {
    const SEC = [["Intro", 16, 0.35, "--b-low"], ["Breakdown", 8, 0.3, "--b-lowmid"], ["Build-up", 8, 0.6, "--b-himid"], ["Drop", 16, 1, "--b-pres"], ["Breakdown", 8, 0.3, "--b-lowmid"], ["Build-up", 8, 0.65, "--b-himid"], ["Drop 2", 16, 1, "--b-pres"], ["Outro", 16, 0.4, "--b-sub"]];
    const cv = V.canvas(170);
    const draw = () => {
      const { g, w, h } = V.fit(cv, 170);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const total = SEC.reduce((a, s) => a + s[1], 0); let x = 0;
      const pts = [];
      SEC.forEach(([n, bars, e, col], i) => {
        const ww = (bars / total) * w;
        g.fillStyle = V.css(col); g.globalAlpha = 0.2; g.fillRect(x, 0, ww - 2, h); g.globalAlpha = 1;
        g.fillStyle = V.css("--screen-ink"); g.font = "600 10px " + V.css("--f-mono"); g.fillText(n.toUpperCase(), x + 4, 14); g.globalAlpha = 0.6; g.fillText(bars + " comp.", x + 4, 27); g.globalAlpha = 1;
        const y0 = h - 10 - e * (h - 50);
        if (n.startsWith("Build")) { pts.push([x, h - 10 - 0.3 * (h - 50)]); pts.push([x + ww, h - 10 - 0.95 * (h - 50)]); }
        else if (n === "Outro") { pts.push([x, y0]); pts.push([x + ww, h - 10 - 0.1 * (h - 50)]); }
        else if (n === "Intro") { pts.push([x, h - 10 - 0.15 * (h - 50)]); pts.push([x + ww, y0]); }
        else { pts.push([x, y0]); pts.push([x + ww, y0]); }
        x += ww;
      });
      g.beginPath(); g.moveTo(0, h); pts.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(w, h); g.closePath();
      g.fillStyle = V.css("--accent"); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
      g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.strokeStyle = V.css("--accent"); g.lineWidth = 2.5; g.stroke();
    };
    requestAnimationFrame(draw); window.addEventListener("resize", draw); S.onLeave(() => window.removeEventListener("resize", draw));
    return box("La curva de energía de un tema de club (según Swindali)", scr(cv), "96 compases, unos 3 minutos a 128 BPM. Los dos drops son la cima; todo lo demás existe para que lleguen con fuerza.");
  };

  // ---------------------------------------------------------------
  W.dimensions = function () {
    const P = [["Bombo", 0, 0.08, 0.05, "--b-sub", 18], ["Bajo", 0, 0.16, 0.1, "--b-low", 16], ["Caja", 0.05, 0.45, 0.2, "--b-mid", 13], ["Voz", 0, 0.55, 0.05, "--accent", 15], ["Hi-hat", 0.45, 0.92, 0.3, "--b-air", 10], ["Lead", -0.4, 0.68, 0.3, "--b-pres", 12], ["Pad", 0.6, 0.45, 0.8, "--b-lowmid", 14], ["Pad", -0.6, 0.45, 0.8, "--b-lowmid", 14], ["Reverb", 0, 0.6, 1, "--b-himid", 9]];
    let yaw = -0.6, pitch = 0.35;
    const cv = V.canvas(300);
    const draw = () => {
      const { g, w, h } = V.fit(cv, 300);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const S3 = Math.min(w, h) * 0.32, cx = w / 2, cy = h / 2 + 10;
      const pr = (x, y, z) => { const x1 = x * Math.cos(yaw) - z * Math.sin(yaw), z1 = x * Math.sin(yaw) + z * Math.cos(yaw); const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch); return [cx + x1 * S3, cy - y1 * S3, z2]; };
      // box edges: x pan [-1,1], y freq [-1,1], z depth [-1,1]
      const E = [[[-1, -1, -1], [1, -1, -1]], [[-1, -1, 1], [1, -1, 1]], [[-1, 1, -1], [1, 1, -1]], [[-1, 1, 1], [1, 1, 1]], [[-1, -1, -1], [-1, 1, -1]], [[1, -1, -1], [1, 1, -1]], [[-1, -1, 1], [-1, 1, 1]], [[1, -1, 1], [1, 1, 1]], [[-1, -1, -1], [-1, -1, 1]], [[1, -1, -1], [1, -1, 1]], [[-1, 1, -1], [-1, 1, 1]], [[1, 1, -1], [1, 1, 1]]];
      g.strokeStyle = V.css("--screen-grid"); g.lineWidth = 1;
      E.forEach(([a, b]) => { const p = pr(...a), q = pr(...b); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); });
      const ax = (a, b, lab, col) => { const p = pr(...a), q = pr(...b); g.strokeStyle = V.css(col); g.lineWidth = 2; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); g.fillStyle = V.css(col); g.font = "600 11px " + V.css("--f-mono"); g.fillText(lab, q[0] + 6, q[1]); };
      ax([-1, -1, -1], [1, -1, -1], "ANCHO · paneo", "--b-himid");
      ax([-1, -1, -1], [-1, 1, -1], "ALTO · frecuencia", "--b-air");
      ax([-1, -1, -1], [-1, -1, 1], "PROFUNDIDAD · reverb", "--b-lowmid");
      P.map((p) => ({ p, q: pr(p[1], p[2] * 2 - 1, p[3] * 2 - 1) })).sort((a, b) => b.q[2] - a.q[2]).forEach(({ p, q }) => {
        const r = p[5] * (1 - p[3] * 0.3);
        g.fillStyle = V.css(p[4]); g.globalAlpha = 0.9; g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill(); g.globalAlpha = 1;
        g.fillStyle = V.css("--screen-ink"); g.font = "10px " + V.css("--f-mono"); g.fillText(p[0], q[0] + r + 3, q[1] + 3);
      });
    };
    let drag = null;
    cv.addEventListener("pointerdown", (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) * 0.01; pitch = Math.max(-1.2, Math.min(1.2, drag[3] + (e.clientY - drag[1]) * 0.01)); draw(); });
    cv.addEventListener("pointerup", () => (drag = null));
    cv.style.cursor = "grab"; cv.style.touchAction = "none";
    requestAnimationFrame(draw); window.addEventListener("resize", draw); S.onLeave(() => window.removeEventListener("resize", draw));
    return box("La mezcla como un espacio 3D", scr(cv), "Arrastrá para girar. Bombo, bajo y voz al centro y adelante; los pads abiertos a los costados y atrás; los hi-hats arriba. Cada sonido ocupa su propio lugar.");
  };

  // ---------------------------------------------------------------
  const bandListen = (BANDS, title, cap, notes) => {
    let g = null, solo = -1;
    const c = () => A.ctx();
    let hp = null, lp = null, an = null;
    const cv = V.canvas(190);
    const ensure = () => {
      if (g) return;
      g = grooveFor(S.labs.GENRES[1], true);
      hp = c().createBiquadFilter(); lp = c().createBiquadFilter(); hp.type = "highpass"; lp.type = "lowpass"; hp.Q.value = lp.Q.value = 0.9;
      const hp2 = c().createBiquadFilter(), lp2 = c().createBiquadFilter(); hp2.type = "highpass"; lp2.type = "lowpass";
      an = V.mkAnalyser(4096, 0.8);
      g.out.connect(hp).connect(hp2).connect(lp).connect(lp2).connect(an).connect(A.master);
      hp.hp2 = hp2; lp.lp2 = lp2;
    };
    const apply = () => {
      if (!g) return;
      const t = c().currentTime, b = BANDS[solo];
      const lo = b ? b.from : 10, hi = b ? b.to : 22000;
      [hp, hp.hp2].forEach((n) => n.frequency.setTargetAtTime(lo, t, 0.02));
      [lp, lp.lp2].forEach((n) => n.frequency.setTargetAtTime(Math.min(22000, hi), t, 0.02));
    };
    const btns = BANDS.map((b, i) => {
      const bt = el("button", { type: "button", class: "btn sm", style: { borderBottom: "3px solid " + V.css(b.v) } }, b.name);
      bt.addEventListener("click", () => { solo = solo === i ? -1 : i; paint(); ensure(); if (!g.playing) { exclusive(() => { g.stop(); play.setOn(false); }); g.start(); play.setOn(true); } apply(); });
      return bt;
    });
    const info = el("p", { style: { margin: 0, fontSize: "14.5px", minHeight: "2.6em" } });
    const paint = () => { btns.forEach((b, i) => b.classList.toggle("on", i === solo)); const b = BANDS[solo]; info.innerHTML = b ? "<strong>" + b.name + " · " + V.fmtHz(b.from) + "–" + V.fmtHz(b.to) + " Hz.</strong> " + b.desc : "Mezcla completa. Elegí una banda para escucharla sola."; };
    paint();
    const play = U.playBtn("Escuchar", (on) => { ensure(); if (on) { exclusive(() => { g.stop(); play.setOn(false); }); apply(); g.start(); } else g.stop(); });
    V.loop(() => {
      const { g: x, w, h } = V.fit(cv, 190);
      x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
      BANDS.forEach((b, i) => { const x0 = V.fx(b.from, w), x1 = V.fx(b.to, w); x.fillStyle = V.css(b.v); x.globalAlpha = solo === i ? 0.32 : 0.1; x.fillRect(x0, 0, x1 - x0 - 1, h); x.globalAlpha = 1; x.fillRect(x0, 0, x1 - x0 - 1, 3); });
      V.freqGrid(x, w, h);
      if (an) V.drawSpectrum(x, w, h, an, { fill: false, min: -105, max: -20 });
      (notes || []).forEach(([f0, f1, t], k) => { const a = V.fx(f0, w), b = V.fx(f1, w); x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.85; x.fillRect(a, 22 + k * 15, Math.max(2, b - a), 3); x.font = "10px " + V.css("--f-mono"); x.fillText(t, Math.min(a, w - 150), 34 + k * 15); x.globalAlpha = 1; });
    });
    return box(title, el("div", { style: { display: "grid", gap: "10px" } }, el("div", { class: "btn-row" }, btns), scr(cv), info), cap, play);
  };
  W.bands = () => bandListen(V.BANDS, "Escuchá cada zona del espectro", "Las marcas blancas son el mapa de Swindali (libro de EDM): sub, zona \"barrosa\", zona nasal, máxima sensibilidad del oído y aire.",
    [[20, 100, "sub < 100 Hz"], [180, 225, "barro 180–225 Hz"], [400, 600, "nasal / boxy 400–600"], [1600, 3000, "oído más sensible 1,6–3k"], [10000, 20000, "aire > 10 kHz"]]);
  W.rogersBands = () => bandListen([
    { name: "LOW", from: 20, to: 130, v: "--b-sub", desc: "Pegada, retumbe y sub. El bombo vive acá (≈80 Hz en hip hop, hasta 120 Hz en rock)." },
    { name: "LOWER-MIDS", from: 130, to: 1500, v: "--b-lowmid", desc: "Cuerpo, calidez y la línea de bajo. Es el puente entre graves y medios-agudos." },
    { name: "UPPER-MIDS", from: 1500, to: 9000, v: "--b-himid", desc: "Según Rogers, cerca del 75 % de voces, guitarras y melodía. La banda más importante: por acá empieza." },
    { name: "HIGH", from: 9000, to: 20000, v: "--b-air", desc: "Hi-hats, platillos, brillo. Si los hats molestan, Rogers baja esta banda hasta ~7 kHz." },
  ], "Las 4 bandas de Rogers", "Rogers corrige en algún capítulo los límites (por ejemplo 1–9 kHz para UPPER-MIDS). Lo importante es la lógica: decidir banda por banda, contra una referencia.");

  // ---------------------------------------------------------------
  W.gain = function () {
    const STEPS = [["Todo en silencio", [], "Master a 0 dB, todos los canales silenciados."], ["Bombo a −6 dB", ["kick"], "El canal más importante primero, picando cerca de −6 dB."], ["+ Bajo", ["kick", "bass"], "Sumalo escuchando con el bombo, no en solo."], ["+ Clap y hats", ["kick", "bass", "clap", "hat"], "Batería completa."], ["+ Pad y lead", ["kick", "bass", "clap", "hat", "pad", "lead"], "Todo sonando: el master debería seguir en −6 dB o menos."]];
    let g = null, an = null, step = 0, ph = -99, pt = 0;
    const lvl = { kick: -2, bass: -4, clap: -8, hat: -14, pad: -10, lead: -11 };
    const meter = el("i", { style: { height: "0%" } }), read = el("span", { class: "big-read" }, "–∞"), desc = el("p", { style: { margin: 0, fontSize: "15px" } });
    const ensure = () => { if (g) return; g = grooveFor(S.labs.GENRES[0], true); for (const k in lvl) g.buses[k].gain.value = A.dbToGain(lvl[k]); an = V.mkAnalyser(2048, 0); g.out.connect(an).connect(A.master); };
    const apply = () => { if (!g) return; const on = STEPS[step][1]; g.mutes = {}; ["kick", "bass", "clap", "hat", "pad", "lead", "snare"].forEach((k) => (g.mutes[k] = !on.includes(k))); };
    const btns = STEPS.map((s, i) => { const b = el("button", { type: "button", class: "btn sm" }, (i + 1) + ". " + s[0]); b.addEventListener("click", () => { step = i; ensure(); apply(); if (!g.playing) { exclusive(() => { g.stop(); play.setOn(false); }); g.start(); play.setOn(true); } paint(); }); return b; });
    const paint = () => { btns.forEach((b, i) => b.classList.toggle("on", i === step)); desc.textContent = STEPS[step][2]; };
    paint();
    const play = U.playBtn("Escuchar", (on) => { ensure(); apply(); if (on) { exclusive(() => { g.stop(); play.setOn(false); }); g.start(); } else g.stop(); });
    V.loop((ts) => {
      if (!an) return;
      const db = A.gainToDb(V.rms(an).peak);
      if (db > ph || ts - pt > 1500) { ph = db; pt = ts; }
      meter.style.height = Math.max(0, Math.min(100, ((db + 48) / 48) * 100)) + "%";
      read.textContent = ph < -80 ? "–∞" : ph.toFixed(1) + " dB";
      read.style.color = ph > -6 ? V.css("--warn") : V.css("--ink");
    });
    const scale = el("div", { style: { position: "relative", height: "130px", width: "22px" } }, el("div", { class: "meter", style: { position: "absolute", inset: 0 } }, meter), el("div", { style: { position: "absolute", left: "-4px", right: "-4px", bottom: (42 / 48) * 100 + "%", height: "2px", background: "var(--hot)" } }));
    return box("La mezcla guía de Swindali", el("div", { style: { display: "grid", gap: "12px" } }, el("div", { class: "btn-row" }, btns), el("div", { style: { display: "flex", gap: "18px", alignItems: "center" } }, scale, el("div", { style: { display: "grid", gap: "6px" } }, el("span", { class: "eyebrow" }, "Pico del master · línea roja = −6 dB"), read, desc))), "Recorré los pasos con la música sonando. Fijate cuánto sube el pico con cada capa: por eso se empieza bajo.", play);
  };

  // ---------------------------------------------------------------
  W.chains = function () {
    const col = (title, author, steps, color) => el("div", { class: "group", style: { "--gc": V.css(color) } }, el("div", { class: "gt" }, el("i"), title + " · " + author),
      el("ol", { style: { margin: 0, paddingLeft: "1.3em", display: "grid", gap: "6px", fontSize: "14.5px" } }, steps.map(([n, d]) => el("li", null, el("b", null, n), d ? el("span", { style: { color: "var(--muted)" } }, " · " + d) : null))));
    return box("Dos cadenas de mastering", el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" } },
      col("Cadena fija", "Rogers", [["EQ de 5 bandas"], ["EQ Mid-Side"], ["Reverb multibanda", "rara vez; 10–15 % wet, nunca debajo de ~1 kHz"], ["Compresor multibanda", "el corazón del método"], ["Excitador multibanda"], ["Widener multibanda", "solo en agudos"], ["Maximizador", "siempre último; techo −0,2 dB"]], "--b-air"),
      col("Cadena en Ozone", "Swindali", [["HPF a 30 Hz", "pendiente máxima"], ["Excitador multibanda", "mezclado dry/wet"], ["Compresión 2,5:1", "ataque lento, poca reducción"], ["Saturación de cinta"], ["Imager", "graves angostos, agudos abiertos; correlación ≥ 0"], ["Maximizador", "sin pasarse: conservar transitorios"]], "--b-pres")),
      "Coinciden en lo esencial: limpiar, ecualizar, comprimir poco, cuidar el estéreo y limitar al final.");
  };

  // ---------------------------------------------------------------
  W.percent = function () {
    let thr = 0.5, ratio = 4;
    const cv = V.canvas(190);
    const env = (t) => { const beat = t % 0.25; const a = 0.95 * Math.exp(-beat * 22) + 0.28 + 0.1 * Math.sin(t * 9) ; return Math.min(1, a * (0.8 + 0.2 * Math.sin(t * 1.3))); };
    const comp = (a) => (a <= thr ? a : thr * Math.pow(a / thr, 1 / ratio));
    const draw = () => {
      const { g, w, h } = V.fit(cv, 190);
      g.fillStyle = V.css("--screen"); g.fillRect(0, 0, w, h);
      const mid = h / 2, A0 = h / 2 - 14;
      for (let x = 0; x < w; x++) {
        const t = (x / w) * 2, a = env(t) * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.9)));
        g.fillStyle = V.css("--screen-ink"); g.globalAlpha = 0.25; g.fillRect(x, mid - a * A0, 1, a * A0 * 2);
        const o = comp(a); g.globalAlpha = 1; g.fillStyle = V.css("--b-himid"); g.fillRect(x, mid - o * A0, 1, o * A0 * 2);
      }
      [0.8, 0.65, 0.5, 0.4].forEach((p) => { g.strokeStyle = p === thr ? V.css("--hot") : V.css("--screen-grid"); g.lineWidth = p === thr ? 2 : 1; g.setLineDash(p === thr ? [] : [3, 4]); g.beginPath(); g.moveTo(0, mid - p * A0); g.lineTo(w, mid - p * A0); g.stroke(); g.setLineDash([]); g.fillStyle = p === thr ? V.css("--hot") : V.css("--screen-ink"); g.font = "10px " + V.css("--f-mono"); g.fillText(Math.round(p * 100) + "%", w - 34, mid - p * A0 - 3); });
    };
    const info = el("p", { class: "mono", style: { margin: 0, fontSize: "13px" } });
    const upd = () => { info.textContent = "Umbral " + Math.round(thr * 100) + "% de la onda ≈ " + (20 * Math.log10(thr)).toFixed(1) + " dB bajo el pico · ratio " + ratio + ":1"; draw(); };
    const tseg = U.seg([[0.8, "80% cortar la punta"], [0.65, "65%"], [0.5, "50% leve"], [0.4, "40%"]], 0.5, (v) => { thr = v; upd(); }, "Umbral");
    const rseg = U.seg([[2, "2:1"], [3, "3:1"], [4, "4:1"], [5, "5:1"], [8, "8:1"], [30, "30:1"]], 4, (v) => { ratio = v; upd(); }, "Ratio");
    requestAnimationFrame(upd); window.addEventListener("resize", draw); S.onLeave(() => window.removeEventListener("resize", draw));
    return box("Compresión \"a ojo\" según Rogers", el("div", { style: { display: "grid", gap: "10px" } }, scr(cv), tseg, rseg, info), "Gris: la onda original. Amarillo: la onda comprimida. Rogers ajusta el umbral mirando la onda: \"cortar la punta\" es 80 % con 30:1; \"adelgazar una banda\" es cerca de 60 % con 8:1.");
  };

  // ---------------------------------------------------------------
  W.replaygain = function () {
    const Z = [[96, 97, "Mínimo (solo si el cliente insiste)", "--b-low"], [97, 98, "Rock clásico, jazz, clásica, bandas sonoras, infantil", "--b-lowmid"], [98, 98.5, "Pop, dance, EDM, country, R&B, reggae", "--b-pres"], [99, 99.5, "Hip hop, rap, hard rock, metal", "--b-himid"], [100, 100.5, "Máximo absoluto, a pedido", "--hot"], [101, 102, "Límite matemático: suele sonar mal", "--muted"]];
    const lo = 95.5, hi = 102.5;
    const bar = el("div", { style: { position: "relative", height: "46px", background: "var(--panel-2)", borderRadius: "6px", overflow: "hidden" } });
    Z.forEach(([a, b, t, col]) => bar.append(el("i", { title: t, style: { position: "absolute", left: ((a - lo) / (hi - lo)) * 100 + "%", width: Math.max(2.5, ((b - a) / (hi - lo)) * 100) + "%", top: 0, bottom: 0, background: V.css(col) } })));
    const axis = el("div", { class: "mono", style: { position: "relative", height: "16px", fontSize: "11px", color: "var(--muted)" } }, [96, 97, 98, 99, 100, 101, 102].map((d) => el("span", { style: { position: "absolute", left: ((d - lo) / (hi - lo)) * 100 + "%", transform: "translateX(-50%)" } }, d)));
    const legend = el("div", { style: { display: "grid", gap: "4px", fontSize: "13.5px" } }, Z.map(([a, b, t, col]) => el("div", { style: { display: "flex", gap: "8px", alignItems: "baseline" } }, el("i", { style: { width: "10px", height: "10px", background: V.css(col), borderRadius: "2px", flex: "none" } }), el("b", { class: "mono" }, a === b ? a : a + "–" + b), el("span", null, t))));
    return box("Objetivos de ReplayGain de Rogers", el("div", { style: { display: "grid", gap: "8px" } }, bar, axis, legend), "Ojo: esta escala es la de ReplayGain que usa Rogers, no LUFS; no se convierte directamente.");
  };

  // ---------------------------------------------------------------
  W.war = function () {
    let mode = "dyn", g = null, nodes = null;
    const cv = V.canvas(180);
    const draw = () => {
      const { g: x, w, h } = V.fit(cv, 180);
      x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
      const half = w / 2 - 6, mid = h / 2 + 8, A0 = h / 2 - 20;
      const wave = (ox, squash, col, label) => {
        for (let i = 0; i < half; i++) {
          const t = i / half, sec = t < 0.3 ? 0.45 : t < 0.5 ? 0.3 : 1;
          let a = sec * (0.55 + 0.45 * Math.exp(-((i % 18) / 4))) * (0.75 + 0.25 * Math.sin(i * 1.7));
          if (squash) a = Math.tanh(a * 3.2) / Math.tanh(3.2) * 0.98;
          x.fillStyle = V.css(col); x.fillRect(ox + i, mid - a * A0, 1, a * A0 * 2);
        }
        x.fillStyle = V.css("--screen-ink"); x.font = "600 11px " + V.css("--f-mono"); x.fillText(label, ox + 4, 14);
      };
      wave(0, false, "--b-low", "DINÁMICO");
      wave(w / 2 + 6, true, "--hot", "APLASTADO");
    };
    const ensure = () => {
      if (g) return;
      const c = A.ctx();
      g = grooveFor(S.labs.GENRES[1], true); g.out.gain.value = 0.5;
      const dry = c.createGain(), drive = c.createGain(), lim = c.createDynamicsCompressor(), clip = c.createWaveShaper(), wet = c.createGain();
      lim.threshold.value = -24; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05; lim.knee.value = 0;
      const n = 1024, cur = new Float32Array(n); for (let i = 0; i < n; i++) { const xx = (i / (n - 1)) * 2 - 1; cur[i] = Math.tanh(xx * 3) / Math.tanh(3) * 0.97; } clip.curve = cur;
      drive.gain.value = 6;
      g.out.connect(dry).connect(A.master); g.out.connect(drive).connect(lim).connect(clip).connect(wet).connect(A.master);
      nodes = { dry, wet };
    };
    const apply = () => { if (!nodes) return; const t = A.ctx().currentTime; nodes.dry.gain.setTargetAtTime(mode === "dyn" ? 1 : 0, t, 0.02); nodes.wet.gain.setTargetAtTime(mode === "sq" ? 1 : mode === "sqm" ? 0.32 : 0, t, 0.02); };
    const seg = U.seg([["dyn", "Dinámico"], ["sq", "Aplastado"], ["sqm", "Aplastado, mismo volumen"]], "dyn", (v) => { mode = v; apply(); }, "Versión");
    const play = U.playBtn("Escuchar", (on) => { ensure(); apply(); if (on) { exclusive(() => { g.stop(); play.setOn(false); }); g.start(); } else g.stop(); });
    requestAnimationFrame(draw); window.addEventListener("resize", draw); S.onLeave(() => window.removeEventListener("resize", draw));
    return box("La guerra del volumen", el("div", { style: { display: "grid", gap: "10px" } }, scr(cv), seg), "El aplastado parece \"mejor\" porque suena más fuerte. Compará con \"mismo volumen\": a igual nivel, se escucha lo que perdiste. Burgess: la mejor práctica es no sobrecomprimir una mezcla.", play);
  };

  // ---------------------------------------------------------------
  W.timer = function () {
    const st = U.store.get("timer", { days: {} });
    let total = 15 * 60, left = total, running = false, last = 0;
    const cv = V.canvas(200);
    const read = el("div", { class: "big-read", style: { fontSize: "56px", textAlign: "center" } });
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: "4px" } });
    const today = () => new Date().toISOString().slice(0, 10);
    const paintGrid = () => {
      grid.replaceChildren();
      const d0 = new Date(); d0.setDate(d0.getDate() - 29);
      for (let i = 0; i < 30; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); const k = d.toISOString().slice(0, 10); grid.append(el("i", { title: k, style: { aspectRatio: "1", borderRadius: "3px", background: st.days[k] ? V.css("--ok") : "var(--panel-2)", outline: k === today() ? "2px solid var(--ink)" : "none" } })); }
    };
    const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
    const draw = () => {
      const { g, w, h } = V.fit(cv, 200);
      g.clearRect(0, 0, w, h);
      const r = Math.min(w, h) / 2 - 12, cx = w / 2, cy = h / 2;
      g.lineWidth = 12; g.strokeStyle = V.css("--panel-2"); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
      g.strokeStyle = V.css(left <= 0 ? "--ok" : "--b-pres"); g.lineCap = "round"; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - left / total) * Math.PI * 2); g.stroke(); g.lineCap = "butt";
      read.textContent = fmt(left);
    };
    const done = () => { running = false; st.days[today()] = true; U.store.set("timer", st); paintGrid(); U.toast("¡Sesión cumplida! Hoy suma al desafío."); try { const c = A.ctx(); [0, 0.25, 0.5].forEach((d, i) => A.voices.tone(A.master, c.currentTime + d, [523, 659, 784][i], 0.3, "sine", 0.15)); } catch (e) {} startB.textContent = "Empezar"; };
    V.loop((ts) => { if (running) { if (last) left = Math.max(0, left - (ts - last) / 1000); last = ts; if (left <= 0) done(); } else last = 0; draw(); });
    const startB = el("button", { type: "button", class: "btn primary" }, "Empezar");
    startB.addEventListener("click", () => { if (left <= 0) left = total; running = !running; startB.textContent = running ? "Pausa" : "Seguir"; });
    const reset = el("button", { type: "button", class: "btn sm", onclick: () => { running = false; left = total; startB.textContent = "Empezar"; } }, "Reiniciar");
    const seg = U.seg([[15, "15 min"], [30, "30 min (recompromiso)"], [10, "10 min"]], 15, (m) => { total = m * 60; left = total; running = false; startB.textContent = "Empezar"; }, "Duración");
    paintGrid();
    return box("Temporizador de sesión · desafío de 30 días", el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "center" } },
      el("div", { style: { position: "relative" } }, cv, el("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center" } }, read)),
      el("div", { style: { display: "grid", gap: "10px" } }, seg, el("div", { class: "btn-row" }, startB, reset), el("span", { class: "eyebrow" }, "Últimos 30 días"), grid)),
      "Cada sesión completa pinta el día de verde (se guarda en este navegador). La consigna de Music Habits: no romper la cadena.");
  };

  // ---------------------------------------------------------------
  W.session = function () {
    const ST = [["Visualizar", "Imaginá el tema terminado y bien recibido.", 0], ["Organizarse", "Plantilla con pistas, envíos de reverb y delay, niveles revisados, escritorio limpio.", 0.15], ["Crear libre", "Tocá, probá, grabá todo. Sin juzgar.", 0], ["Copiar, pegar, borrar", "Quedate o cortá cada idea rápido, por instinto.", 0.5], ["Arreglar", "Ordená las secciones. Si te trabás, copiá la estructura de otro tema.", 0.7], ["Rellenar huecos", "FX, EQ, limpieza.", 0.85], ["Mezclar", "Empezando por batería y bajo.", 1]];
    let cur = 2;
    const row = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px" } });
    const detail = el("p", { style: { margin: 0, fontSize: "15px" } });
    const btns = ST.map(([n], i) => { const b = el("button", { type: "button", style: { border: "1px solid var(--line)", borderRadius: "4px", padding: "8px 4px", cursor: "pointer", fontSize: "11.5px", fontFamily: "var(--f-mono)", lineHeight: 1.25, minHeight: "64px", color: "var(--ink)" } }, String(i + 1), el("br"), n); b.addEventListener("click", () => { cur = i; paint(); }); return b; });
    row.append(...btns);
    const paint = () => { btns.forEach((b, i) => { const j = ST[i][2]; b.style.background = "color-mix(in srgb, var(--b-pres) " + Math.round((1 - j) * 30) + "%, color-mix(in srgb, var(--b-low) " + Math.round(j * 30) + "%, var(--panel)))"; b.style.outline = i === cur ? "2px solid var(--ink)" : "none"; }); detail.innerHTML = "<strong>" + ST[cur][0] + ".</strong> " + ST[cur][1] + " <span style=\"color:var(--muted)\">· " + (ST[cur][2] < 0.4 ? "modo creativo" : "modo crítico") + "</span>"; };
    paint();
    const legend = el("div", { class: "mono", style: { display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)" } }, el("span", null, "← jugar, generar"), el("span", null, "juzgar, ordenar →"));
    return box("Una sesión en siete pasos (Music Habits)", el("div", { style: { display: "grid", gap: "10px" } }, row, legend, detail), "El orden importa: si juzgás mientras creás, frenás las dos cosas.");
  };

  // ---------------------------------------------------------------
  W.habits = function () {
    return box("Diez herramientas de Music Habits", el("div", { class: "habit-cards" }, C.HABITS.map(([t, d]) => el("article", null, el("h4", null, t), el("p", null, d)))), null);
  };
})(window.S);
