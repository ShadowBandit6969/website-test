/* Metrics — pro KPI animation
   - Each KPI reveals with: soft lift, glossy sweep, % unit slide-in
   - Big number counts (0 → ±target), with blur → crisp + micro scale-pop
   - Works with signs “+ / −” and integers (e.g. +27, −60)
   - Fires once per card via IntersectionObserver; respects reduced motion
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
      el.src = src; el.onload = res; el.onerror = () => rej(new Error("failed "+src));
      document.head.appendChild(el);
    });
  }

  // ------- number helpers -------
  const MINUS = "−"; // U+2212 (typographic minus)
  function parseSignedInt(txt){
    const str = String(txt).trim();
    const sign = str.startsWith("+") ? "+" : (str.startsWith(MINUS) || str.startsWith("-") ? MINUS : "");
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

  // ------- glossy sweep overlay (no external CSS) -------
  function addSweep(kpiEl){
    const sweep = document.createElement("span");
    Object.assign(kpiEl.style, { position: "relative", overflow: "hidden" });
    Object.assign(sweep.style, {
      position: "absolute",
      top: 0, bottom: 0,
      left: "-120%",
      width: "60%",
      transform: "skewX(-20deg)",
      background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.35) 50%, rgba(255,255,255,0) 100%)",
      filter: "blur(6px)",
      opacity: "0.0",
      pointerEvents: "none",
      zIndex: "1"
    });
    kpiEl.appendChild(sweep);
    return sweep;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("metrics");
    if (!root) return;

    if (!window.gsap) await loadScript(CDN);
    const { gsap } = window;

    const cards = $$(".results-steps .result-step", root);

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

      // Build sweep & initial states
      const sweep = addSweep(kpi);

      // Parse original number (+27 / −60 …)
      const { sign, value } = parseSignedInt(val.textContent);
      const signedTarget = (sign === MINUS ? -value : value);

      // Initial styles (clean & subtle)
      gsap.set(card, { y: 22, autoAlpha: 0, filter: "blur(4px)" });
      gsap.set(kpi,  { scale: 0.96 });
      gsap.set(val,  { display: "inline-block", filter: "blur(8px)", letterSpacing: "0.06em" });
      gsap.set(unit, { yPercent: 40, autoAlpha: 0, filter: "blur(6px)" });
      h3 && gsap.set(h3, { y: 10, autoAlpha: 0, filter: "blur(4px)" });
      p  && gsap.set(p,  { y: 10, autoAlpha: 0, filter: "blur(4px)" });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Card lift-in
      tl.to(card, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.42 }, 0);

      // KPI pop + number blur → crisp + counting
      tl.to(kpi, { scale: 1.0, duration: 0.36, ease: "back.out(1.6)" }, 0.02);

      tl.to(val, {
        filter: "blur(0px)", letterSpacing: "0.0em",
        duration: 0.6, ease: "power2.out",
        onStart(){
          // prefix sign visually (for + we keep the plus if present)
          if (sign === "+") {
            // Optional: keep static plus left of val (already in text), we’ll re-apply at end if needed
            // For counting we only set numeric text; plus can be in CSS/HTML; here we keep number only,
            // and countTo adds minus if needed. If you want a visible plus, keep "+" in val before count:
            val.textContent = "0"; // plus sign often appears before .val in your markup; adjust if needed
          } else {
            val.textContent = sign === MINUS ? MINUS + "0" : "0";
          }
          countTo(val, signedTarget, 1.15);
        }
      }, 0.06);

      // Glossy sweep
      tl.to(sweep, {
        left: "130%", opacity: 0.55, duration: 0.65, ease: "power2.out",
        onStart(){ sweep.style.opacity = "0.35"; },
        onComplete(){ sweep.remove(); }
      }, 0.10);

      // Unit slide
      tl.to(unit, { yPercent: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.38 }, 0.20);

      // Headline + copy settle
      h3 && tl.to(h3, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.36 }, 0.16);
      p  && tl.to(p,  { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.40 }, 0.22);

      // Micro “breathe” on KPI after settle
      tl.to(kpi, { scale: 1.02, duration: 0.12, ease: "sine.out" }, 0.75)
        .to(kpi, { scale: 1.00, duration: 0.18, ease: "sine.inOut" }, ">");

      // OPTIONAL: replay sweep on hover (desktop)
      if (window.matchMedia("(hover: hover)").matches) {
        card.addEventListener("pointerenter", () => {
          const sw = addSweep(kpi);
          gsap.fromTo(sw, { left: "-120%", opacity: 0.0 }, {
            left: "130%", opacity: 0.45, duration: 0.6, ease: "power2.out",
            onComplete: () => sw.remove()
          });
        });
      }
    }
  });
})();
