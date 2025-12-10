/* =========================================================
   Basis: Lazy Loading, Video-Härtefälle, GSAP on-view
   (satzweise, extrem performante Opacity-Version)
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

  // ---------- A11y-sicherer Satz-Splitter (statt Zeichen/Wort) ----------
  function splitSentences(el) {
    if (!el) return [];
    // Wiederverwendung, falls bereits gesplittet
    if (el.querySelector('.sentence')) return el.querySelectorAll('.sentence');

    const original = el.textContent ?? '';
    if (!original.trim()) return [];

    el.setAttribute('aria-label', original);
    el.setAttribute('role', 'text');

    // Sätze grob über ., !, ? trennen – inkl. nachfolgender Leerzeichen
    const parts = original.match(/[^.!?]+[.!?]*\s*/g) || [original];

    el.innerHTML = parts
      .map(s => `<span class="sentence">${s}</span>`)
      .join('');

    const sentences = el.querySelectorAll('.sentence');
    // Start: leicht ausgegraut (70% Sichtbarkeit)
    gsap.set(sentences, { opacity: 0.7 });

    return sentences;
  }

  // Kontext: sauberes Cleanup bei Single-Page-Navigation usw.
  const ctx = gsap.context(() => {
    /* -------- Headline/Subline: Satz-für-Satz von 0.7 → 1 -------- */
    const headlineEl = section.querySelector('.headline');
    const sublineEl  = section.querySelector('.subline');

    ScrollTrigger.create({
      trigger: section,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        if (REDUCE) {
          [headlineEl, sublineEl].forEach(el => el && gsap.set(el, { opacity: 1, clearProps: 'transform,filter' }));
          return;
        }

        const headlineSentences = splitSentences(headlineEl);
        const sublineSentences  = splitSentences(sublineEl);

        if (headlineSentences.length) {
          gsap.to(headlineSentences, {
            opacity: 1,
            stagger: 0.25,     // Satz für Satz
            duration: 0.5,
            ease: 'power1.out'
          });
        } else if (headlineEl) {
          // Fallback
          gsap.to(headlineEl, { opacity: 1, duration: 0.3 });
        }

        if (sublineSentences.length) {
          gsap.to(sublineSentences, {
            opacity: 1,
            stagger: 0.25,
            duration: 0.5,
            ease: 'power1.out',
            delay: 0.1
          });
        } else if (sublineEl) {
          gsap.to(sublineEl, { opacity: 1, duration: 0.3 });
        }
      }
    });

    /* -------- Karten: Titel, Snippet, Fließtext und Listen -------- */
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
            [titleEl, snippetEl, ...pEls, ...liEls].forEach(el => el && gsap.set(el, { opacity: 1, clearProps: 'transform,filter' }));
            return;
          }

          // Titel / Snippet / Paragraphen → satzweise
          const titleSentences   = splitSentences(titleEl);
          const snippetSentences = splitSentences(snippetEl);
          const pSentencesList   = [...pEls].map(splitSentences);

          if (titleSentences.length) {
            gsap.to(titleSentences, {
              opacity: 1,
              stagger: 0.25,
              duration: 0.45,
              ease: 'power1.out'
            });
          } else if (titleEl) {
            gsap.to(titleEl, { opacity: 1, duration: 0.3 });
          }

          if (snippetSentences.length) {
            gsap.to(snippetSentences, {
              opacity: 1,
              stagger: 0.25,
              duration: 0.45,
              ease: 'power1.out',
              delay: 0.08
            });
          } else if (snippetEl) {
            gsap.to(snippetEl, { opacity: 1, duration: 0.3 });
          }

          pSentencesList.forEach((sentences, i) => {
            if (!sentences.length) {
              if (pEls[i]) gsap.to(pEls[i], { opacity: 1, duration: 0.3 });
              return;
            }
            gsap.to(sentences, {
              opacity: 1,
              stagger: 0.2,
              duration: 0.4,
              ease: 'power1.out',
              delay: 0.1 + i * 0.08
            });
          });

          // Listen: jedes <li> als "Satz"
          if (liEls.length) {
            // Startzustand: leicht ausgegraut
            gsap.set(liEls, { opacity: 0.7 });

            gsap.to(liEls, {
              opacity: 1,
              duration: 0.4,
              stagger: 0.15,   // Ein Punkt nach dem anderen
              ease: 'power1.out',
              delay: 0.12
            });
          }

          // Ultimativer Fallback: falls irgendwas nicht erwischt wurde
          const allTextBlocks = [
            titleEl,
            snippetEl,
            ...pEls,
            ...liEls
          ].filter(Boolean);

          if (allTextBlocks.length) {
            gsap.to(allTextBlocks, {
              opacity: 1,
              duration: 0.01,
              delay: 1.0    // nach allen anderen Tweens
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
