/* Produciendo Música — router y páginas */
window.S = window.S || {};
(function (S) {
  const { el } = S.ui, U = S.ui, A = S.audio, V = S.viz, C = S.content, L = S.labs, W = S.widgets;

  // cleanup registry for route changes
  let leaves = [];
  S.onLeave = (fn) => leaves.push(fn);
  const leave = () => { leaves.forEach((f) => { try { f(); } catch (e) {} }); leaves = []; V.stopAll(); A.stopAll(); };

  const LABS = [
    ["beat", "beat", "ritmo"], ["mix", "mix", "mezcla"], ["arreglo", "arrange", "arreglo"], ["eq", "eq", "mezcla"],
    ["comp", "comp", "mezcla"], ["master", "master", "mastering"], ["oido", "ear", "escucha"], ["synth", "synth", "ritmo"],
  ];
  const labDef = (id) => { const r = LABS.find((x) => x[0] === id); return r && Object.assign({ id: r[0], lesson: r[2] }, L[r[1]]); };
  const LAB_QUOTE = { beat: "e_boring", mix: "b_recede", arreglo: "e_drop1st", eq: "r_cutfirst", comp: "m_dull", master: "r_100", oido: "m_listen", synth: "e_melody" };

  const progress = U.store.get("progress", {});
  const setDone = (id) => { progress[id] = true; U.store.set("progress", progress); paintProgress(); };
  const progPill = el("span", { class: "progress-pill" });
  const paintProgress = () => { const n = C.LESSONS.filter((l) => progress[l.id]).length; progPill.textContent = n + "/" + C.LESSONS.length + " lecciones"; };

  const quoteEl = (id, compact) => {
    const qd = C.QUOTES[id]; if (!qd) return null;
    const b = C.BOOKS[qd.b];
    return el("figure", { class: "quote", style: { "--qc": b.color } },
      el("blockquote", null, "«" + qd.es + "»"),
      compact ? null : el("div", { class: "orig", lang: "en" }, "“" + qd.en + "”"),
      el("figcaption", null, el("b", null, b.author), " · ", el("i", null, b.title), " · " + qd.where));
  };

  // ------------------------------------------------------------------ header
  const NAV = [["", "Inicio"], ["lecciones", "Lecciones"], ["lab", "Lab"], ["biblioteca", "Biblioteca"], ["glosario", "Glosario"]];
  const navLinks = NAV.map(([h, t]) => el("a", { href: "#" + h }, t));
  const themeBtn = el("button", { type: "button", class: "theme-btn", title: "Cambiar tema claro / oscuro", "aria-label": "Cambiar tema claro / oscuro", html: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>' });
  themeBtn.addEventListener("click", () => {
    const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    r.dataset.theme = dark ? "light" : "dark"; U.store.set("theme", r.dataset.theme); route();
  });
  const savedTheme = U.store.get("theme", null); if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  const brand = el("a", { class: "brand", href: "#", html: '<svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="6" fill="var(--ink)"/><path d="M4 15h4l2-7 3 14 3-18 3 16 2-5h5" fill="none" stroke="var(--bg)" stroke-width="2" stroke-linejoin="round"/></svg><span style="display:grid"><b>Produciendo Música</b><small>Escuela de producción</small></span>' });
  const header = el("header", { class: "topbar" }, el("div", { class: "wrap" }, brand, el("nav", { class: "nav", "aria-label": "Secciones" }, navLinks), progPill, themeBtn));
  const main = el("main", { id: "main" });
  const footer = el("footer", { class: "footer" }, el("div", { class: "wrap" },
    el("span", null, "Produciendo Música · Hecho con IA a partir de cinco libros de producción, con fines educativos. Todo el audio se sintetiza en vivo en tu navegador."),
    el("span", null, "Basado en Burgess, Swindali, Rogers y Timothy · ", el("a", { href: "#biblioteca" }, "ver biblioteca"))));
  document.body.append(header, main, footer);
  paintProgress();

  // ------------------------------------------------------------------ pages
  const P = {};

  P.home = (root) => {
    const cv = el("canvas");
    let g = null, an = null;
    const playBtn = U.playBtn("Escuchar un groove", (on) => {
      if (!g) { g = A.track(new A.Groove({ bpm: 124, lead: true })); g.pattern = L.patternFrom(L.GENRES[1]); g.mutes = {}; an = V.mkAnalyser(2048, 0.8); g.connect(an).connect(A.master); }
      on ? g.start() : g.stop();
    });
    playBtn.classList.add("screen-play");
    root.append(el("section", { class: "hero" },
      el("div", null,
        el("div", { class: "eyebrow" }, "5 libros · 7 lecciones · 8 laboratorios"),
        el("h1", null, "Producí con los ", el("em", null, "oídos"), " y con los ojos"),
        el("p", { class: "lede" }, "Una escuela visual de producción musical: lecciones cortas con ideas de los libros que forman a productores, y un laboratorio donde cada concepto suena y se ve."),
        el("div", { class: "btn-row" }, el("a", { class: "btn primary", href: "#leccion-oficio", html: U.icon.arrow + "<span>Empezar la lección 1</span>" }), el("a", { class: "btn", href: "#lab" }, "Abrir el laboratorio"))),
      el("div", { class: "hero-screen" }, cv, el("span", { class: "screen-label" }, "Espectro · 20 Hz – 20 kHz"), playBtn)));
    // hero animation: idle = synthetic spectrum, playing = real analyser
    let tt = 0;
    V.loop(() => {
      const { g: x, w, h } = V.fit(cv, cv.clientHeight);
      x.fillStyle = V.css("--screen"); x.fillRect(0, 0, w, h);
      V.freqGrid(x, w, h, { bands: true });
      if (an && g && g.playing) { V.drawSpectrum(x, w, h, an, { fill: true, alpha: 0.45, min: -100, max: -15 }); }
      else {
        tt += 0.012;
        x.beginPath();
        for (let px = 0; px <= w; px += 3) {
          const f = px / w;
          const v = 0.62 - f * 0.38 + 0.08 * Math.sin(f * 14 + tt * 2) + 0.05 * Math.sin(f * 37 - tt * 3) + 0.12 * Math.exp(-Math.pow((f - 0.18) * 9, 2)) * (0.6 + 0.4 * Math.sin(tt * 6));
          const y = h - v * h * 0.85; px ? x.lineTo(px, y) : x.moveTo(px, y);
        }
        x.strokeStyle = V.css("--screen-ink"); x.lineWidth = 1.5; x.stroke();
        x.lineTo(w, h); x.lineTo(0, h); x.closePath();
        const grad = x.createLinearGradient(0, 0, w, 0);
        V.BANDS.forEach((b) => grad.addColorStop(Math.min(1, V.fx(Math.sqrt(b.from * b.to), w) / w), V.css(b.v)));
        x.globalAlpha = 0.4; x.fillStyle = grad; x.fill(); x.globalAlpha = 1;
      }
      x.font = "10px " + V.css("--f-mono"); x.fillStyle = V.css("--screen-ink"); x.globalAlpha = 0.65;
      ["SUB", "GRAVES", "MED-GRAV", "MEDIOS", "MED-AGUD", "PRESENCIA", "AIRE"].forEach((n, i) => x.fillText(n, V.fx(V.BANDS[i].from, w) + 4, i % 2 ? 50 : 36));
      x.globalAlpha = 1;
    });

    root.append(aboutBlock());
    root.append(el("div", { class: "sec-head" }, el("h2", null, "Lecciones"), el("a", { href: "#lecciones", class: "eyebrow" }, "Ver el programa →")), moduleGrid());
    root.append(el("div", { class: "sec-head" }, el("h2", null, "Laboratorio"), el("a", { href: "#lab", class: "eyebrow" }, "Todos los labs →")), labGrid());
    const ids = ["h_wins", "b_museum", "r_loudplay"];
    root.append(el("div", { class: "sec-head" }, el("h2", null, "Del libro"), el("a", { href: "#biblioteca", class: "eyebrow" }, "86 citas de 5 libros →")), el("div", { class: "quote-grid" }, ids.map((i) => quoteEl(i, true))));
  };

  // what this is, where the lessons come from, and the AI disclaimer
  const DISCLAIMER = "Contenido elaborado con inteligencia artificial (Claude, de Anthropic) a partir de esos libros, con fines exclusivamente educativos. Puede contener errores o simplificaciones: no reemplaza la lectura de los libros originales. Las citas son breves y sus derechos pertenecen a los autores y editoriales.";
  const aboutBlock = () => el("section", { class: "about", "aria-labelledby": "about-h" },
    el("div", { class: "about-text" },
      el("div", { class: "eyebrow" }, "Sobre este proyecto"),
      el("h2", { id: "about-h" }, "Lecciones armadas con cinco libros de producción"),
      el("p", null, "Cada lección de Produciendo Música se escribió leyendo estos libros: sus ideas, sus cifras y sus casos prácticos están reorganizados en un recorrido corto y visual. Cuando un dato sale de un libro, se nombra al autor; cuando es una cita, aparece en el idioma original con su traducción. Los laboratorios sirven para escuchar y ver lo que los libros explican con palabras."),
      el("p", { class: "disclaimer" }, DISCLAIMER)),
    el("ul", { class: "about-books" }, Object.values(C.BOOKS).map((b) => el("li", { style: { "--bk": b.color } }, el("a", { href: "#biblioteca" }, el("b", null, b.title), el("span", null, b.author))))));

  const moduleGrid = () => el("div", { class: "modules" }, C.LESSONS.map((l) => {
    const cv = el("canvas", { class: "wave" });
    requestAnimationFrame(() => V.waveIcon(cv, l.wave, V.css(l.color)));
    return el("a", { class: "module-card" + (progress[l.id] ? " done" : ""), href: "#leccion-" + l.id, style: { "--mc": V.css(l.color) } },
      cv, el("span", { class: "num" }, String(l.n).padStart(2, "0")), el("h3", null, l.title), el("p", null, l.lede),
      el("div", { class: "meta" }, el("span", null, l.mins + " min · " + l.sources.length + " libros"), progress[l.id] ? el("span", { class: "done-chip", html: U.icon.check + " leída" }) : el("span", null, l.kicker)));
  }));

  const labGrid = () => el("div", { class: "labs" }, LABS.map(([id]) => {
    const d = labDef(id), cv = el("canvas");
    requestAnimationFrame(() => {
      const { g, w, h } = V.fit(cv, 90); const col = V.css(d.color);
      g.clearRect(0, 0, w, h); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2;
      if (id === "beat") for (let i = 0; i < 16; i++) { g.globalAlpha = [0, 4, 8, 12, 6, 14].includes(i) ? 1 : 0.2; g.fillRect(i * (w / 16) + 2, h / 2 - 10, w / 16 - 4, 20); }
      else if (id === "eq" || id === "oido") { g.beginPath(); for (let x = 0; x <= w; x++) { const y = h / 2 - 26 * Math.exp(-Math.pow((x / w - (id === "eq" ? 0.35 : 0.62)) * 7, 2)) + (id === "eq" ? 14 * Math.exp(-Math.pow((x / w - 0.8) * 6, 2)) : 0); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      else if (id === "comp") { g.beginPath(); g.moveTo(0, h - 6); g.lineTo(w * 0.55, h * 0.35); g.lineTo(w, h * 0.2); g.stroke(); }
      else if (id === "master") for (let x = 0; x < w; x += 2) { const a = Math.min(0.42, 0.5 * Math.abs(Math.sin(x * 0.7)) * (0.6 + 0.4 * Math.sin(x * 0.05))); g.fillRect(x, h / 2 - a * h, 1, a * h * 2); }
      else if (id === "mix") [[0.5, 0.7, 12], [0.3, 0.45, 8], [0.72, 0.4, 9], [0.5, 0.3, 7], [0.18, 0.62, 6]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a * w, b * h, r, 0, 7); g.fill(); });
      else if (id === "arreglo") { g.beginPath(); [[0, 0.8], [0.2, 0.6], [0.3, 0.75], [0.42, 0.35], [0.45, 0.15], [0.65, 0.15], [0.67, 0.7], [0.8, 0.3], [0.82, 0.15], [1, 0.6]].forEach(([a, b], i) => (i ? g.lineTo(a * w, b * h) : g.moveTo(a * w, b * h))); g.stroke(); }
      else { g.beginPath(); for (let x = 0; x <= w; x++) { const y = h / 2 - Math.sin(x * 0.12) * 20 * Math.exp(-x / w * 1.5); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    });
    return el("a", { class: "lab-card", href: "#lab-" + id, style: { "--lc": V.css(d.color) } }, el("span", { class: "tag" }, d.tag), cv, el("h3", null, d.title), el("p", null, d.desc));
  }));

  P.lessons = (root) => {
    root.append(el("div", { class: "eyebrow" }, "El programa"), el("h1", { class: "page-title" }, "Siete lecciones"),
      el("p", { class: "page-lede" }, "De quién hace qué en un estudio hasta cómo terminar un tema. Cada lección mezcla texto corto, citas de los libros, figuras que suenan, casos reales y un mini cuestionario. Los recuadros \"Profundizar\" son para cuando quieras ir más a fondo."),
      moduleGrid());
  };

  P.lesson = (root, id) => {
    const l = C.LESSONS.find((x) => x.id === id);
    if (!l) return P.notFound(root);
    root.style.setProperty("--mc", V.css(l.color));
    const toc = el("nav", { class: "toc", "aria-label": "En esta lección" }, el("div", { class: "eyebrow" }, "En esta lección"));
    const body = el("article", { class: "prose" });
    let sn = 0;
    l.blocks.forEach((b) => {
      if (b.t === "p") body.append(el("p", { html: b.html }));
      else if (b.t === "h") { sn++; const hid = "s" + sn; body.append(el("h2", { id: hid }, el("span", { class: "sn" }, String(sn).padStart(2, "0")), b.text)); toc.append(el("a", { href: "#leccion-" + l.id, onclick: (e) => { e.preventDefault(); document.getElementById(hid).scrollIntoView({ behavior: "smooth" }); } }, b.text)); }
      else if (b.t === "quote") body.append(quoteEl(b.id));
      else if (b.t === "list") body.append(el("ul", null, b.items.map((i) => el("li", null, i))));
      else if (b.t === "widget") { try { body.append(W[b.w](b.opts)); } catch (e) { console.error(b.w, e); } }
      else if (b.t === "case") body.append(el("section", { class: "callout case" }, el("header", null, el("span", { class: "dot" }), "Caso práctico · " + b.title), el("div", { html: b.html })));
      else if (b.t === "tip") body.append(el("section", { class: "callout tip" }, el("header", null, el("span", { class: "dot" }), b.title), el("div", { html: b.html })));
      else if (b.t === "deep") body.append(el("details", { class: "deep" }, el("summary", null, b.title), el("div", { html: b.html })));
      else if (b.t === "lab") { const d = labDef(b.id); body.append(el("a", { class: "lab-card", href: "#lab-" + b.id, style: { "--lc": V.css(d.color), margin: "24px 0", fontFamily: "var(--f-ui)" } }, el("span", { class: "tag" }, "Ir al laboratorio · " + d.tag), el("h3", null, d.title + " →"), el("p", null, b.text))); }
    });
    toc.append(el("a", { href: "#leccion-" + l.id, onclick: (e) => { e.preventDefault(); quiz.scrollIntoView({ behavior: "smooth" }); } }, "Cuestionario"));
    // quiz
    const answered = new Set();
    const quiz = el("section", { class: "quiz" }, el("h2", null, "Comprobá lo que aprendiste"));
    const result = el("p", { class: "eyebrow", style: { margin: "12px 0 0" } });
    let score = 0;
    l.quiz.forEach((qq, qi) => {
      const why = el("p", { class: "why", hidden: true });
      const opts = qq.o.map((o, oi) => {
        const b = el("button", { type: "button", class: "opt" }, o);
        b.addEventListener("click", () => {
          if (answered.has(qi)) return; answered.add(qi);
          if (oi === qq.a) score++;
          opts.forEach((x, k) => { if (k === qq.a) x.classList.add("right"); else if (k === oi) x.classList.add("wrong"); x.disabled = true; });
          why.hidden = false; why.textContent = (oi === qq.a ? "Correcto. " : "No exactamente. ") + qq.why;
          if (answered.size === l.quiz.length) { result.textContent = score + " de " + l.quiz.length + " correctas · lección marcada como leída"; setDone(l.id); }
        });
        return b;
      });
      quiz.append(el("div", { class: "q" }, el("p", { class: "qt" }, (qi + 1) + ". " + qq.q), el("div", { class: "opts" }, opts), why));
    });
    quiz.append(result);
    body.append(quiz);
    const i = C.LESSONS.indexOf(l), prev = C.LESSONS[i - 1], next = C.LESSONS[i + 1];
    body.append(el("div", { class: "lesson-nav" },
      prev ? el("a", { class: "btn", href: "#leccion-" + prev.id, html: U.icon.back + "<span>" + prev.title + "</span>" }) : el("span"),
      next ? el("a", { class: "btn primary", href: "#leccion-" + next.id, html: "<span>" + next.title + "</span>" + U.icon.arrow }) : el("a", { class: "btn primary", href: "#lab" }, "Ir al laboratorio")));
    root.append(
      el("header", { class: "lesson-head" },
        el("div", { class: "num" }, String(l.n).padStart(2, "0")),
        el("div", { class: "eyebrow" }, "Lección " + l.n + " · " + l.kicker + " · " + l.mins + " min"),
        el("h1", null, l.title), el("p", { class: "lede" }, l.lede),
        el("div", { class: "sources" }, l.sources.map((s) => el("span", { class: "src-chip" }, C.BOOKS[s].author + " · " + C.BOOKS[s].title)))),
      el("div", { class: "lesson-layout" }, toc, body));
  };

  P.labs = (root) => {
    root.append(el("div", { class: "eyebrow" }, "Laboratorio"), el("h1", { class: "page-title" }, "Tocá todo"),
      el("p", { class: "page-lede" }, "Ocho herramientas para escuchar lo que leés. Todo el sonido se genera en vivo en tu navegador: no hay samples ni descargas. Usá auriculares o monitores y empezá con el volumen bajo."),
      labGrid());
  };

  const labTabs = (cur) => el("nav", { class: "lab-tabs", "aria-label": "Laboratorios" }, LABS.map(([id]) => el("a", { href: "#lab-" + id, "aria-current": id === cur ? "page" : null }, labDef(id).title)));
  P.lab = (root, id) => {
    const d = labDef(id); if (!d) return P.notFound(root);
    const les = C.LESSONS.find((l) => l.id === d.lesson);
    const qd = C.QUOTES[LAB_QUOTE[id]], b = qd && C.BOOKS[qd.b];
    root.append(labTabs(id),
      el("div", { class: "lab-head" },
        el("div", null, el("div", { class: "eyebrow" }, "Lab · " + d.tag), el("h1", null, d.title), el("p", null, d.desc)),
        les ? el("a", { class: "btn", href: "#leccion-" + les.id }, "Lección " + les.n + ": " + les.title) : null),
      qd ? el("p", { style: { margin: "0 0 20px", fontFamily: "var(--f-body)", fontSize: "18px", fontStyle: "italic", maxWidth: "70ch", borderLeft: "3px solid " + b.color, paddingLeft: "12px" } }, "«" + qd.es + "» ", el("span", { class: "eyebrow", style: { fontStyle: "normal" } }, "— " + b.author)) : null);
    const host = el("div"); root.append(host);
    try { d.render(host); } catch (e) { console.error(e); host.append(el("p", null, "No se pudo iniciar el audio en este navegador: " + e.message)); }
  };

  P.library = (root) => {
    let filter = null, term = "";
    root.append(el("div", { class: "eyebrow" }, "Biblioteca"), el("h1", { class: "page-title" }, "Los cinco libros"),
      el("p", { class: "page-lede" }, "Esta escuela se apoya en cinco libros de producción. Tocá una tapa para ver sus citas y de qué trata. Las citas van en el idioma original con su traducción."));
    const covers = el("div", { class: "books" });
    const about = el("div");
    const grid = el("div", { class: "quote-grid" });
    const search = el("input", { type: "search", id: "qsearch", class: "search", placeholder: "Buscar en las citas: mezcla, bombo, terminar…" });
    search.addEventListener("input", () => { term = search.value.toLowerCase(); paint(); });
    const btns = Object.entries(C.BOOKS).map(([k, bk]) => {
      const n = Object.values(C.QUOTES).filter((q) => q.b === k).length;
      const b = el("button", { type: "button", class: "book", "aria-pressed": "false" },
        el("div", { class: "cover", style: { "--bk": bk.color }, html: '<span class="ct">' + bk.title + '</span><svg viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 30 ' + Array.from({ length: 20 }, (_, i) => "Q" + (i * 10 + 5) + " " + (30 + (i % 2 ? -1 : 1) * (8 + ((i * 7 + k.length * 3) % 18))) + " " + (i * 10 + 10) + " 30").join(" ") + '" fill="none" stroke="#fff" stroke-width="2"/></svg><span class="ca">' + bk.author + "</span>" }),
        el("span", { class: "bt" }, bk.sub + " · " + n + " citas"));
      b.addEventListener("click", () => { filter = filter === k ? null : k; btns.forEach(([kk, bb]) => bb.setAttribute("aria-pressed", String(kk === filter))); paint(); });
      covers.append(b);
      return [k, b];
    });
    const paint = () => {
      about.replaceChildren();
      if (filter) { const bk = C.BOOKS[filter]; about.append(el("section", { class: "callout", style: { "--cc": bk.color } }, el("header", null, el("span", { class: "dot", style: { background: bk.color } }), bk.author + " · " + bk.title), el("div", null, el("p", null, bk.about)))); }
      const list = Object.entries(C.QUOTES).filter(([, q]) => (!filter || q.b === filter) && (!term || (q.es + " " + q.en + " " + q.where).toLowerCase().includes(term)));
      grid.replaceChildren(...(list.length ? list.map(([id]) => quoteEl(id)) : [el("p", null, "No hay citas con \"" + term + "\". Probá con otra palabra.")]));
    };
    paint();
    root.append(covers, about, el("div", { class: "filter-row" }, search), grid, el("p", { class: "disclaimer", style: { marginTop: "32px" } }, DISCLAIMER));
  };

  P.glossary = (root) => {
    const dl = el("dl", { class: "gloss" });
    const search = el("input", { type: "search", id: "gsearch", class: "search", placeholder: "Buscar un término…" });
    const paint = () => { const t = search.value.toLowerCase(); dl.replaceChildren(...C.GLOSSARY.filter(([a, b]) => !t || (a + b).toLowerCase().includes(t)).flatMap(([a, b]) => [el("dt", null, a), el("dd", null, b)])); };
    search.addEventListener("input", paint); paint();
    root.append(el("div", { class: "eyebrow" }, "Glosario"), el("h1", { class: "page-title" }, "Palabras del estudio"), el("p", { class: "page-lede" }, "Los términos que aparecen en las lecciones y los labs, explicados en una o dos líneas."), search, dl);
  };

  P.notFound = (root) => root.append(el("h1", { class: "page-title" }, "No encontrado"), el("p", null, el("a", { href: "#" }, "Volver al inicio")));

  // ------------------------------------------------------------------ router
  const route = () => {
    leave();
    const h = (location.hash || "#").slice(1);
    main.replaceChildren();
    const root = el("div", { class: "wrap" }); main.append(root);
    let nav = "";
    if (!h) P.home(root);
    else if (h === "lecciones") { P.lessons(root); nav = "lecciones"; }
    else if (h.startsWith("leccion-")) { P.lesson(root, h.slice(8)); nav = "lecciones"; }
    else if (h === "lab") { P.labs(root); nav = "lab"; }
    else if (h.startsWith("lab-")) { P.lab(root, h.slice(4)); nav = "lab"; }
    else if (h === "biblioteca") { P.library(root); nav = "biblioteca"; }
    else if (h === "glosario") { P.glossary(root); nav = "glosario"; }
    else P.notFound(root);
    navLinks.forEach((a, i) => a.setAttribute("aria-current", NAV[i][0] === nav ? "page" : "false"));
    window.scrollTo(0, 0);
    document.title = "Produciendo Música";
  };
  window.addEventListener("hashchange", route);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!document.documentElement.dataset.theme) route(); });
  route();
})(window.S);
