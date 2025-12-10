/* Metrics — pro KPI animation
   - Count-Up (0 → ±target) bleibt erhalten
   - Rest nur über Opacity (0.7 → 1.0), keine Blur-/Y-/Sweep-Effekte
   - Sehr performant: minimale Styles, nur wenige Tweens
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
      el.onerror = () => rej(new Error("failed "+src));
      document.head.appendChild(el);
    });
  }

  // ------- number helpers -------
  const MINUS = "−"; // U+2212 (typographic minus)
  function parseSignedInt(txt){
    const str = String(txt).trim();
    const sign = str.startsWith("+")
      ? "+"
      : (str.startsWith(MINUS) || str.startsWith("-") ? MINUS : "");
    const num  = parseInt(str.replace(/[^\d]/g, "") || "0", 10);
    return { sign, value: num };
  }

  // Count from 0 → target with ease; supports negative (0 → -N)
  function countTo(el, target, durSec = 1.1){
    const negative = target < 0;
    const to = Math.abs(target);
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic

    function tick(now){
      const p = Math.min(1, (now - t0) / (durSec * 1000));
      const v = Math.round(to * ease(p));
      el.textContent = (negative ? MINUS : "") + String(v);
      if (p < 1) requestAnimationFrame(tick);
    }

    el.textContent = negative ? MINUS + "0" : "0";
    requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("metrics");
    if (!root) return;

    if (!window.gsap) await loadScript(CDN);
    const { gsap } = window;

    const cards = $$(".results-steps .result-step", root);
    if (!cards.length) return;

    // IO per card
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        io.unobserve(card);
        animateCard(card);
      });
    }, { root: null, threshold: 0.35, rootMargin: "0% 0px -10% 0px" });

    cards.forEach(c => io.observe(c));

    function animateCard(card){
      const kpi  = $(".kpi", card);
      const val  = $(".kpi .val", card);
      const unit = $(".kpi .unit", card);
      const h3   = $("h3", card);
      const p    = $("p", card);

      if (!kpi || !val) return;

      // Parse original number (+27 / −60 …)
      const { sign, value } = parseSignedInt(val.textContent);
      const signedTarget = (sign === MINUS ? -value : value);

      // Initial states – alles leicht sichtbar (0.7), nichts springt
      gsap.set(card, { opacity: 0.7 });
      gsap.set(kpi,  { opacity: 0.7 });
      gsap.set(val,  { opacity: 0.7 });
      unit && gsap.set(unit, { opacity: 0.7 });
      h3   && gsap.set(h3,   { opacity: 0.7 });
      p    && gsap.set(p,    { opacity: 0.7 });

      const tl = gsap.timeline({ defaults: { ease: "power1.out" } });

      // Card insgesamt klarer
      tl.to(card, { opacity: 1, duration: 0.35 }, 0);

      // KPI leicht hervorheben
      tl.to(kpi, { opacity: 1, duration: 0.35 }, 0);

      // Zahl: Opacity + Count-Up
      tl.to(val, {
        opacity: 1,
        duration: 0.35,
        onStart(){
          // Für das Zählen selbst wird der Text neu gesetzt
          if (sign === "+") {
            val.textContent = "0"; // Plus kann z.B. im Layout separat stehen
          } else {
            val.textContent = sign === MINUS ? MINUS + "0" : "0";
          }
          countTo(val, signedTarget, 1.1);
        }
      }, 0.05);

      // Einheit
      if (unit) {
        tl.to(unit, {
          opacity: 1,
          duration: 0.35
        }, 0.10);
      }

      // Überschrift + Copy
      const textBlocks = [h3, p].filter(Boolean);
      if (textBlocks.length) {
        tl.to(textBlocks, {
          opacity: 1,
          duration: 0.4,
          stagger: 0.1
        }, 0.12);
      }

      // Safety: nach ~1.5s alles voll sichtbar, falls irgendwas nicht erwischt wurde
      const all = [card, kpi, val, unit, h3, p].filter(Boolean);
      tl.to(all, {
        opacity: 1,
        duration: 0.01,
        delay: 1.2
      });
    }
  });
})();
