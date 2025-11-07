/* =========================================================
   Basis: Lazy Loading, Video-Härtefälle, GSAP on-view
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  /* ---------------- Lazy Images (data-src & .lazy-comet) ---------------- */
  const lazyImgs = document.querySelectorAll('img[data-src], img.lazy-comet');

  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        const dataSrc = img.dataset.src;
        if (dataSrc) img.src = dataSrc;
        img.removeAttribute('data-src');
        img.classList.remove('lazy-comet');
        obs.unobserve(img);
      }
    }, { rootMargin: '120px 0px', threshold: 0.01 });

    lazyImgs.forEach(img => imgObserver.observe(img));
  } else {
    // Fallback: sofort laden
    lazyImgs.forEach(img => {
      if (img.dataset.src) img.src = img.dataset.src;
      img.classList.remove('lazy-comet');
    });
  }

  /* ------- Optional: PiP/Download einschränken (validator-freundlich) ---- */
  const vid = document.querySelector('#svc-social video');
  if (vid) {
    try {
      if (vid.controlsList?.add) {
        vid.controlsList.add('nodownload');
        vid.controlsList.add('noplaybackrate');
      }
      if ('disablePictureInPicture' in vid) {
        vid.disablePictureInPicture = true;
      }
      vid.addEventListener('contextmenu', e => e.preventDefault());
    } catch (_) {}
  }

  /* ========================= GSAP: nur-on-view ========================= */
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn('GSAP / ScrollTrigger nicht gefunden.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const section = document.querySelector('#nebula-hub');
  if (!section) return;

  // ---------- A11y-sicherer Text-Splitter ----------
  function splitText(el) {
    if (!el) return [];
    // Wiederverwendung, falls bereits gesplittet
    if (el.querySelector('.char')) return el.querySelectorAll('.char');

    const original = el.textContent ?? '';
    el.setAttribute('aria-label', original);
    el.setAttribute('role', 'text');

    const words = original.trim().split(/(\s+)/);
    el.innerHTML = words.map(w => {
      if (/^\s+$/.test(w)) return w; // echte Spaces behalten
      const chars = [...w].map(c => `<span class="char">${c}</span>`).join('');
      return `<span class="word">${chars}</span>`;
    }).join('');

    return el.querySelectorAll('.char');
  }

  // Kontext: sauberes Cleanup bei Single-Page-Navigation usw.
  const ctx = gsap.context(() => {
    /* -------- Headline/Subline: Start erst beim Sichtkontakt -------- */
    const headlineEl = section.querySelector('.headline');
    const sublineEl  = section.querySelector('.subline');

    ScrollTrigger.create({
      trigger: section,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        if (REDUCE) {
          // Ohne Bewegung, direkt sichtbar
          [headlineEl, sublineEl].forEach(el => el && gsap.set(el, { opacity: 1, clearProps: 'transform,filter' }));
          return;
        }
        const headlineChars = splitText(headlineEl);
        const sublineChars  = splitText(sublineEl);

        gsap.timeline({ defaults: { ease: 'power4.out' } })
          .from(headlineChars, { opacity: 0, yPercent: 100, stagger: 0.01, duration: 0.7 }, 0)
          .from(sublineChars,  { opacity: 0, yPercent: 120, stagger: 0.01, duration: 0.6 }, '-=0.4');
      }
    });

    /* -------- Karten: Nur Text (h3, .card-snippet, p, li) -------- */
    const cards = section.querySelectorAll('.module-card');

    cards.forEach(card => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          const titleEl   = card.querySelector('h3');
          const snippetEl = card.querySelector('.card-snippet');
          const pEls      = card.querySelectorAll('.payload p:not(.card-snippet)');
          const liEls     = card.querySelectorAll('.payload li');

          if (REDUCE) {
            // Direkt sichtbar, keine Bewegungen
            [titleEl, snippetEl, ...pEls, ...liEls].forEach(el => el && gsap.set(el, { opacity: 1, clearProps: 'transform,filter' }));
            return;
          }

          // Split erst wenn wirklich benötigt (Performance)
          const titleChars   = splitText(titleEl);
          const snippetChars = splitText(snippetEl);
          const pCharsList   = [...pEls].map(splitText);
          // Für LI setzen wir auf Container-Blur statt Zeichen-Splitting (ruhiger & performanter)

          const ease = 'power3.out';

          if (titleChars.length) {
            gsap.from(titleChars, { opacity: 0, yPercent: 120, stagger: 0.01, duration: 0.5, ease });
          }
          if (snippetChars.length) {
            gsap.from(snippetChars, { opacity: 0, yPercent: 120, stagger: 0.008, duration: 0.45, ease, delay: 0.05 });
          }
          pCharsList.forEach((chars, i) => {
            if (!chars.length) return;
            gsap.from(chars, { opacity: 0, yPercent: 110, stagger: 0.008, duration: 0.45, ease, delay: 0.08 + i * 0.06 });
          });

          /* -------- NEU: Blur-Animation für UL/LI --------
             - sanfter Blur + leichtes Anheben
             - kurzer Stagger, klare Lesbarkeit
             - Filter wird danach aufgeräumt (clearProps)
          ------------------------------------------------- */
/* -------- MASTER: UL dann LI nacheinander (sehr smooth & elegant) ------
   - Schritt A: UL-Container auftauchen (Opacity + y + leichter Blur)
   - Schritt B: erst danach LI-Items einzeln, top→bottom, feiner Stagger
   - Ruhige Eases, kurze Delays, Cleanup von filter/y & will-change
--------------------------------------------------------------------------- */
if (liEls.length) {
  const uls = card.querySelectorAll('.payload ul, .payload ol');

  uls.forEach((ul, ulIndex) => {
    // nur direkte Kinder-LIs (verhindert Doppelanimation bei verschachtelten Listen)
    const items = ul.querySelectorAll(':scope > li');
    if (!items.length) return;

    // Pre-State (Null-Jank) – UL und LIs vorbereiten
    gsap.set(ul, {
      opacity: 0,
      y: 10,
      filter: 'blur(10px)',
      willChange: 'opacity,transform,filter',
      transformOrigin: '0 60%'
    });
    gsap.set(items, {
      opacity: 0,
      y: 8,
      filter: 'blur(12px)',
      willChange: 'opacity,transform,filter',
      transformOrigin: '0 60%'
    });

    // Eases & Parameter
    const UL_EASE = 'power2.out';
    const LI_EASE = 'power2.out';

    // Dauer/Timing bewusst kurz & edel
    const UL_DUR   = 0.38;
    const AFTER_UL = 0.08;     // Pause zwischen UL und ersten LI
    // Stagger je LI: ruhig, aber klar nacheinander
    const LI_EACH  = Math.min(0.10, 0.06 + items.length * 0.005);
    const LI_DUR   = 0.56;

    // leichtes Card-Offset bei mehreren ULs
    const BASE_DELAY = 0.08 + ulIndex * 0.08;

    const tl = gsap.timeline({ delay: BASE_DELAY });

    // A) UL-Container zuerst
    tl.to(ul, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: UL_DUR,
      ease: UL_EASE,
      onComplete: () => gsap.set(ul, { clearProps: 'filter,y', willChange: 'auto' })
    });

    // B) Danach LI-Items nacheinander (top → bottom)
    tl.to(items, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: LI_DUR,
      ease: LI_EASE,
      stagger: { each: LI_EACH, from: 'start' }
    }, `+=${AFTER_UL}`);

    // Micro-Polish & Cleanup
    tl.call(() => {
      gsap.set(items, { clearProps: 'filter,y', willChange: 'auto' });
    });
  });
}

        }
      });
    });
  }, section);

  // bfcache / SPA-Szenarien: bei Verlassen aufräumen
  window.addEventListener('pagehide', () => ctx.revert(), { once: true });
});

/* ------- Optional: Karten-Interaktion ohne Seiteneffekt ------- */
function togglePlanet(card) {
  card.classList.toggle('clicked');
}
