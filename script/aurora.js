/* ============================================================
   AURORA REVEAL  ·  v3
   Satzweises Aufhellen + vier Interaktionen:

   · Spotlight    – Karte leuchtet dort, wo der Cursor steht
   · Magnet       – Karte wird sanft zum Cursor gezogen, federt zurück
   · Stagger      – Karte hebt sich, Medien werden aufgedeckt, Text folgt
   · Liquid Hover – Verzerrung auf [data-distort] (SVG-Displacement)

   Alles läuft nur mit echtem Zeiger und ohne Reduced Motion.
   Failsafe: schlägt etwas fehl, ist der Inhalt sofort voll sichtbar.
   ============================================================ */
(function () {
  "use strict";

  if (window.__auroraReveal) return;

  /* ---------------- Konfiguration ---------------- */
  const CFG = {
    gsap: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
    scrollTrigger: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",

    title: "#aurora-crown",
    subs: [
      "#aurora-chant .subtitle-snippet",
      "#aurora-chant .subtitle-t",
      "#aurora-chant .subtitle-full"
    ],
    card: ".aether-card",
    cardTitle: "h3",
    cardCopy: ".snippet, .t-snippet, .microtag, .delta-list li .copy, .delta-list li .lead",
    cardList: ".delta-list li",
    cardMedia: ".media, [data-reveal-media], img, video",

    from: 0.7,            // Startdeckkraft der Textbausteine
    start: "top 82%",
    preload: "1400px",
    timeout: 6000,
    softFocus: false,

    /* --- 2) Spotlight --- */
    spotlight: true,
    glowSize: 340,        // px, Durchmesser des Scheinwerfers
    edgeSize: 260,        // px, Leuchten am Rand
    follow: 0.16,         // 0..1, wie träge der Lichtkegel folgt

    /* --- 3) Magnet --- */
    magnet: true,
    magnetSelector: null, // z. B. ".cta" für einen Button statt der Karte
    magnetPull: 0.14,     // Anteil der Cursordistanz
    magnetMax: 12,        // px, Obergrenze

    /* --- 5) Stagger-Aufbau --- */
    lift: true,
    liftY: 26,            // px, aus denen die Karte hochfährt

    /* --- 4) Liquid Hover --- */
    distort: "auto",      // "auto" = an, sobald [data-distort] existiert
    distortScale: 26
  };

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine    = window.matchMedia("(hover: hover) and (pointer: fine)");

  const teardown = [];
  const on = (el, ev, fn, opt) => {
    el.addEventListener(ev, fn, opt);
    teardown.push(() => el.removeEventListener(ev, fn, opt));
  };

  /* ---------------- Failsafe ---------------- */
  let revealed = false;

  function revealAll() {
    if (revealed) return;
    revealed = true;
    try {
      const css = document.createElement("style");
      css.id = "aurora-reveal-failsafe";
      css.textContent =
        [CFG.title, CFG.subs.join(","), CFG.card].join(",") + "," +
        ".sentence,.word,.char," +
        CFG.card + " " + CFG.cardTitle + "," +
        CFG.card + " :is(" + CFG.cardCopy + ")," +
        CFG.card + " " + CFG.cardList +
        "{opacity:1 !important;filter:none !important;clip-path:none !important;transform:none !important}";
      document.head.appendChild(css);
    } catch (e) { /* still */ }
  }

  let failTimer = 0;
  const armFailsafe = () => { failTimer = window.setTimeout(revealAll, CFG.timeout); };
  const disarm = () => { if (failTimer) { clearTimeout(failTimer); failTimer = 0; } };

  if (reduced.matches) { revealAll(); return; }
  if (reduced.addEventListener) {
    reduced.addEventListener("change", e => { if (e.matches) { destroy(); revealAll(); } });
  }

  /* ---------------- Script-Loader ---------------- */
  const loading = new Map();

  function loadScript(src) {
    if (loading.has(src)) return loading.get(src);

    const p = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      const to = setTimeout(() => reject(new Error("timeout " + src)), CFG.timeout - 500);

      el.src = src;
      el.async = true;
      el.onload = () => { clearTimeout(to); resolve(); };
      el.onerror = () => { clearTimeout(to); reject(new Error("failed " + src)); };
      document.head.appendChild(el);
    });

    loading.set(src, p);
    return p;
  }

  async function ensureGSAP() {
    if (!window.gsap) await loadScript(CFG.gsap);
    if (!window.gsap) throw new Error("gsap missing");
    if (!window.ScrollTrigger) await loadScript(CFG.scrollTrigger);
    if (!window.ScrollTrigger) throw new Error("ScrollTrigger missing");
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  /* ---------------- Stylesheet für die Effektebenen ---------------- */
  let styled = false;

  function injectCSS() {
    if (styled) return;
    styled = true;

    const c = CFG.card;
    const s = document.createElement("style");
    s.id = "aurora-reveal-css";
    s.textContent = `
${c}{position:relative;}
${c} > .ar-glow,
${c} > .ar-edge{
  position:absolute;inset:0;z-index:0;
  border-radius:inherit;box-sizing:border-box;
  pointer-events:none;opacity:0;
}
${c} > .ar-glow{
  background:radial-gradient(var(--ar-glow) circle at var(--mx,50%) var(--my,50%),
    rgba(255,255,255,.18), rgba(255,255,255,.06) 42%, transparent 68%);
}
${c} > .ar-edge{
  padding:1px;
  background:radial-gradient(var(--ar-edge) circle at var(--mx,50%) var(--my,50%),
    rgba(255,255,255,.9), rgba(255,255,255,.2) 45%, transparent 72%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
}
${c} > *:not(.ar-glow):not(.ar-edge){position:relative;z-index:1;}
.ar-filters{position:absolute;width:0;height:0;overflow:hidden;}
[data-distort]{will-change:filter;}
`;
    document.head.appendChild(s);
  }

  /* ---------------- Splitter ---------------- */
  const SENTENCE = /[^.!?…]+[.!?…]*[\s]*/g;

  function units(el) {
    if (!el) return [];

    const existing = $$(".sentence, .word, .char", el);
    if (existing.length) return existing;
    if (el.dataset.split === "1") return [];

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });

    const texts = [];
    let n;
    while ((n = walker.nextNode())) texts.push(n);
    if (!texts.length) { el.dataset.split = "1"; return []; }

    const made = [];

    texts.forEach(node => {
      const parts = node.nodeValue.match(SENTENCE);
      if (!parts || !parts.length) return;

      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        const sp = document.createElement("span");
        sp.className = "sentence";
        sp.textContent = part;
        frag.appendChild(sp);
        made.push(sp);
      });
      node.parentNode.replaceChild(frag, node);
    });

    el.dataset.split = "1";
    return made.length ? made : [el];
  }

  function visible(el) {
    if (!el) return false;
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  /* ============================================================
     2) + 3)  Spotlight und Magnet
     ============================================================ */
  function pointerFX(cards) {
    if (!fine.matches) return;
    if (!CFG.spotlight && !CFG.magnet) return;

    const gsap = window.gsap;

    cards.forEach(card => {
      let glow = null, edge = null;

      if (CFG.spotlight) {
        glow = document.createElement("i");
        edge = document.createElement("i");
        glow.className = "ar-glow";
        edge.className = "ar-edge";
        glow.setAttribute("aria-hidden", "true");
        edge.setAttribute("aria-hidden", "true");
        card.style.setProperty("--ar-glow", CFG.glowSize + "px");
        card.style.setProperty("--ar-edge", CFG.edgeSize + "px");
        card.prepend(edge);
        card.prepend(glow);
      }

      const magTarget = CFG.magnet
        ? (CFG.magnetSelector ? card.querySelector(CFG.magnetSelector) : card)
        : null;

      const xTo = magTarget ? gsap.quickTo(magTarget, "x", { duration: 0.55, ease: "power3.out" }) : null;
      const yTo = magTarget ? gsap.quickTo(magTarget, "y", { duration: 0.55, ease: "power3.out" }) : null;

      /* Der Lichtkegel läuft dem Cursor mit leichter Trägheit hinterher */
      let raf = 0, inside = false;
      let px = 0, py = 0;      // Ziel
      let cx = 0, cy = 0;      // aktuelle Lichtposition
      let rect = null;

      function frame() {
        raf = inside ? requestAnimationFrame(frame) : 0;

        cx += (px - cx) * CFG.follow;
        cy += (py - cy) * CFG.follow;

        if (glow) {
          card.style.setProperty("--mx", cx.toFixed(1) + "px");
          card.style.setProperty("--my", cy.toFixed(1) + "px");
        }

        if (!inside && Math.abs(px - cx) < 0.5 && Math.abs(py - cy) < 0.5) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }

      function enter(e) {
        inside = true;
        rect = card.getBoundingClientRect();
        px = cx = e.clientX - rect.left;
        py = cy = e.clientY - rect.top;

        if (glow) {
          card.style.setProperty("--mx", cx + "px");
          card.style.setProperty("--my", cy + "px");
          gsap.to([glow, edge], { opacity: 1, duration: 0.35, ease: "power2.out", overwrite: true });
        }

        if (magTarget) gsap.set(magTarget, { willChange: "transform" });
        if (!raf) raf = requestAnimationFrame(frame);
      }

      function move(e) {
        if (!rect) rect = card.getBoundingClientRect();
        px = e.clientX - rect.left;
        py = e.clientY - rect.top;

        if (xTo) {
          const dx = px - rect.width / 2;
          const dy = py - rect.height / 2;
          const max = CFG.magnetMax;
          xTo(Math.max(-max, Math.min(max, dx * CFG.magnetPull)));
          yTo(Math.max(-max, Math.min(max, dy * CFG.magnetPull)));
        }
      }

      function leave() {
        inside = false;
        rect = null;

        if (glow) gsap.to([glow, edge], { opacity: 0, duration: 0.5, ease: "power2.out", overwrite: true });

        if (magTarget) {
          /* Federung zurück in die Ausgangslage */
          gsap.to(magTarget, {
            x: 0, y: 0,
            duration: 1.1,
            ease: "elastic.out(1, 0.45)",
            overwrite: true,
            onComplete: () => gsap.set(magTarget, { willChange: "auto" })
          });
        }
      }

      on(card, "pointerenter", e => { if (e.pointerType === "mouse") enter(e); });
      on(card, "pointermove",  e => { if (e.pointerType === "mouse") move(e); }, { passive: true });
      on(card, "pointerleave", leave);

      /* Beim Scrollen stimmt das gemerkte Rechteck nicht mehr */
      on(window, "scroll", () => { if (inside) rect = card.getBoundingClientRect(); }, { passive: true });
    });
  }

  /* ============================================================
     4) Liquid Hover – Verzerrung per SVG-Displacement
     ============================================================ */
  function liquid() {
    if (!fine.matches) return;

    const nodes = $$("[data-distort]");
    if (!nodes.length || CFG.distort === false) return;

    const gsap = window.gsap;
    const NS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ar-filters");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<filter id="ar-liquid" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="7" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    document.body.appendChild(svg);
    teardown.push(() => svg.remove());

    const turb = svg.querySelector("feTurbulence");
    const disp = svg.querySelector("feDisplacementMap");

    nodes.forEach(el => {
      let tl = null;

      on(el, "pointerenter", e => {
        if (e.pointerType !== "mouse") return;

        el.style.filter = "url(#ar-liquid)";

        if (tl) tl.kill();
        tl = gsap.timeline();
        tl.fromTo(disp, { attr: { scale: 0 } },
                        { attr: { scale: CFG.distortScale }, duration: 0.55, ease: "power2.out" }, 0)
          .to(disp,     { attr: { scale: 6 }, duration: 0.9, ease: "power2.inOut" }, 0.55)
          .fromTo(turb, { attr: { baseFrequency: "0.012 0.022" } },
                        { attr: { baseFrequency: "0.02 0.008" }, duration: 1.45, ease: "sine.inOut" }, 0);
      });

      on(el, "pointerleave", () => {
        if (tl) tl.kill();
        tl = gsap.to(disp, {
          attr: { scale: 0 },
          duration: 0.45,
          ease: "power2.out",
          onComplete: () => { el.style.filter = ""; }
        });
      });
    });
  }

  /* ---------------- Aufbau ---------------- */
  let ctx = null;

  function build() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;

    ST.config({ ignoreMobileResize: true, limitCallbacks: true });
    gsap.ticker.lagSmoothing(500, 33);
    injectCSS();

    ctx = gsap.context(() => {

      /* --- Kopfbereich --- */
      const head = gsap.timeline({ defaults: { ease: "power2.out" } });

      const tUnits = units($(CFG.title));
      if (tUnits.length) {
        gsap.set(tUnits, { opacity: CFG.from, willChange: "opacity" });
        head.to(tUnits, {
          opacity: 1,
          duration: 0.7,
          stagger: { each: 0.16, ease: "none" },
          onComplete: () => gsap.set(tUnits, { willChange: "auto" })
        }, 0);
      }

      const subEls = CFG.subs.map(s => $(s)).filter(Boolean);
      const shown = subEls.find(visible) || subEls[subEls.length - 1];

      subEls.forEach(el => {
        const u = units(el);
        if (!u.length) return;
        if (el !== shown) { gsap.set(u, { opacity: 1 }); return; }

        gsap.set(u, { opacity: CFG.from, willChange: "opacity" });
        head.to(u, {
          opacity: 1,
          duration: 0.6,
          stagger: { each: 0.14, ease: "none" },
          onComplete: () => gsap.set(u, { willChange: "auto" })
        }, 0.25);
      });

      /* --- Karten --- */
      const cards = $$(CFG.card);
      if (!cards.length) return;

      /* Ausgangszustand sofort setzen, damit beim Eintreten nichts springt.
         Passiert nur, wenn GSAP wirklich läuft – sonst bleibt alles sichtbar. */
      if (CFG.lift) {
        cards.forEach(card => {
          gsap.set(card, { y: CFG.liftY, opacity: 0, willChange: "transform,opacity" });
          const media = $$(CFG.cardMedia, card);
          if (media.length) gsap.set(media, { clipPath: "inset(0% 0% 100% 0%)" });
        });
      }

      const play = (card, offset) => {
        const title = $(CFG.cardTitle, card);
        const copy  = $$(CFG.cardCopy, card);
        const list  = $$(CFG.cardList, card);
        const media = $$(CFG.cardMedia, card);
        const blocks = [title].concat(copy).filter(Boolean);

        const tl = gsap.timeline({
          delay: offset,
          defaults: { ease: "power2.out" },
          onComplete: () => {
            gsap.set(card, { willChange: "auto" });
            gsap.set(card.querySelectorAll(".sentence, li"), { willChange: "auto" });
            if (media.length) gsap.set(media, { clipPath: "none" });
            if (CFG.softFocus) gsap.set(blocks, { filter: "none" });
            card.classList.add("is-revealed");
          }
        });

        /* 1. die Karte fährt hoch */
        if (CFG.lift) {
          tl.to(card, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 0);

          /* 2. Medien werden aufgedeckt */
          if (media.length) {
            tl.to(media, {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.85,
              ease: "power3.inOut",
              stagger: 0.08
            }, 0.12);
          }
        }

        /* 3. Textblöcke gleiten ein, die Sätze hellen darin nacheinander auf.
              Der Versatz liegt auf den Blöcken – die Sätze sind inline,
              da greift kein transform. */
        const tU = units(title);
        if (title) {
          gsap.set(title, { y: 14, opacity: 1 });
          tl.to(title, { y: 0, duration: 0.6, ease: "power3.out" }, 0.28);
        }
        if (tU.length) {
          gsap.set(tU, { opacity: CFG.from, willChange: "opacity" });
          tl.to(tU, { opacity: 1, duration: 0.55, stagger: { each: 0.15, ease: "none" } }, 0.3);
        }

        copy.forEach((block, i) => {
          const u = units(block);
          gsap.set(block, { y: 12 });
          tl.to(block, { y: 0, duration: 0.55, ease: "power3.out" }, 0.36 + i * 0.07);

          if (!u.length) return;
          gsap.set(u, { opacity: CFG.from, willChange: "opacity" });
          tl.to(u, { opacity: 1, duration: 0.5, stagger: { each: 0.13, ease: "none" } }, 0.4 + i * 0.07);
        });

        if (list.length) {
          gsap.set(list, { y: 10, opacity: CFG.from, willChange: "opacity,transform" });
          tl.to(list, {
            y: 0, opacity: 1,
            duration: 0.55,
            stagger: { each: 0.11, ease: "none" }
          }, 0.46);
        }

        if (CFG.softFocus) {
          gsap.fromTo(blocks,
            { filter: "blur(3px)" },
            { filter: "blur(0px)", duration: 0.8, ease: "power2.out", delay: offset, force3D: true });
        }
      };

      ST.batch(cards, {
        start: CFG.start,
        once: true,
        onEnter: batch => batch.forEach((card, i) => play(card, i * 0.08))
      });

      /* Zeiger-Effekte erst nach dem Aufbau anhängen */
      pointerFX(cards);
      if (CFG.distort) liquid();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ST.refresh()).catch(() => {});
    }
  }

  function destroy() {
    try {
      teardown.splice(0).forEach(fn => { try { fn(); } catch (e) {} });
      $$(".ar-glow, .ar-edge").forEach(el => el.remove());
      if (ctx) { ctx.revert(); ctx = null; }
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(t => t.kill());
    } catch (e) { /* still */ }
  }

  /* ---------------- Start ---------------- */
  let booted = false;

  async function boot() {
    if (booted) return;
    booted = true;
    armFailsafe();

    try {
      await ensureGSAP();
      build();
      disarm();
    } catch (err) {
      disarm();
      revealAll();
      if (window.console) console.warn("[aurora-reveal]", err.message);
    }
  }

  function watch() {
    const targets = [$(CFG.title), $(CFG.card)].filter(Boolean);
    if (!targets.length) { revealAll(); return; }
    if (!("IntersectionObserver" in window)) { boot(); return; }

    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) { obs.disconnect(); boot(); }
    }, { rootMargin: CFG.preload + " 0px" });

    targets.forEach(t => io.observe(t));

    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 2000));
    idle(() => { if (!booted) boot(); }, { timeout: 4000 });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  ready(() => { try { watch(); } catch (e) { revealAll(); } });

  window.__auroraReveal = { boot, destroy, revealAll, config: CFG };
})();
