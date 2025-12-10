/* Arbeitsproben — Gallery Motion (smooth & ultra-performant)
   - Bilder erscheinen früh (großes rootMargin)
   - Alles startet schon leicht sichtbar (0.5–0.75), dann smooth auf 1.0
   - Nur Opacity + leichte Y/Scale, keine Filter/Blur/Parallax
   - Respektiert prefers-reduced-motion
*/
(function () {
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function loadScript(src){
    return new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = res;
      el.onerror = () => rej(new Error("failed " + src));
      document.head.appendChild(el);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const section = document.getElementById("arbeitsproben");
    if (!section) return;

    if (!window.gsap) await loadScript(CDN);
    const { gsap } = window;

    /* ---------- Header: smooth, aber simpel ---------- */
    const title    = $(".board-head .aurora-title", section);
    const subtitle = $(".board-head .aurora-subtitle .subtitle-full", section)
                  || $(".board-head .aurora-subtitle", section);

    if (title) {
      gsap.set(title, { opacity: 0.7, y: 6 });
      gsap.to(title, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
        delay: 0.05
      });
    }

    if (subtitle) {
      gsap.set(subtitle, { opacity: 0.7, y: 8 });
      gsap.to(subtitle, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
        delay: 0.18
      });
    }

    /* ---------- Grid & Cells ---------- */
    const grid  = $(".board-grid", section);
    if (!grid) return;
    const cells = $$(".cell", grid);

    // Pre-State: alles schon „halb da“, nur etwas softer
    cells.forEach((cell, i) => {
      cell.dataset.idx = String(i);

      const fig = $(".card", cell);
      const img = fig && $("img", fig);
      const tag = fig && $(".cap-tag", fig);
      const cap = fig && $(".cap-title", fig);

      gsap.set(cell, { opacity: 0.7, y: 10, willChange: "transform,opacity" });
      fig && gsap.set(fig, { y: 0 });

      if (img) {
        gsap.set(img, {
          opacity: 0.5,
          scale: 1.02,
          transformOrigin: "50% 50%",
          willChange: "transform,opacity"
        });
      }

      tag && gsap.set(tag, { opacity: 0.75, y: 4 });
      cap && gsap.set(cap, { opacity: 0.75, y: 6 });
    });

    // sehr einfacher Stagger
    function getDelay(cell){
      const idx = parseInt(cell.dataset.idx, 10) || 0;
      // etwas kleinerer Schritt → weniger „abgehackt“
      return idx * 0.04; // 40ms pro Karte
    }

    /* ---------- IntersectionObserver: frühes Triggern ---------- */
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const cell = e.target;
        io.unobserve(cell);
        animateCell(cell);
      });
    }, {
      threshold: 0.01,
      rootMargin: "55% 0px -15% 0px" // früh genug, Bilder werden vorgezogen
    });

    cells.forEach(c => io.observe(c));

    function animateCell(cell){
      const fig = $(".card", cell);
      const img = fig && $("img", fig);
      const tag = fig && $(".cap-tag", fig);
      const cap = fig && $(".cap-title", fig);

      const baseDelay = getDelay(cell);

      // Bild: etwas früher, sehr weiche Bewegung
      if (img) {
        const imgDelay = Math.max(0, baseDelay - 0.18);
        gsap.to(img, {
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: "power3.out",
          delay: imgDelay,
          overwrite: "auto"
        });
      }

      // Zelle: weicher Lift + Fade
      gsap.to(cell, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: baseDelay,
        overwrite: "auto",
        onComplete() {
          cell.style.willChange = "auto";
        }
      });

      // Caption: Tag & Titel, leicht versetzt, aber klein
      if (tag) {
        gsap.to(tag, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          delay: baseDelay + 0.10,
          overwrite: "auto"
        });
      }
      if (cap) {
        gsap.to(cap, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          delay: baseDelay + 0.14,
          overwrite: "auto"
        });
      }
    }

    /* ---------- Bild-Load-Fallback ---------- */
    $$(".card img", grid).forEach(img => {
      const show = () => {
        if (!img.style.opacity || img.style.opacity === "0") {
          img.style.opacity = "1";
        }
      };
      if (img.complete) {
        show();
      } else {
        img.addEventListener("load", show, { once: true });
      }
    });

    /* ---------- Interaction hygiene ---------- */
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (card) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true });

    $$(".card", grid).forEach(card => {
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });
  });
})();
