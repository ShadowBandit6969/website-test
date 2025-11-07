
(function () {
  const GSAP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  const ST_CDN   = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed: "+src));
      document.head.appendChild(s);
    });
  }
  async function ensureGSAP() {
    if (!window.gsap) await loadScript(GSAP_CDN);
    if (!window.ScrollTrigger) await loadScript(ST_CDN);
    gsap.registerPlugin(ScrollTrigger);
  }

  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  function splitToWords(el) {
    if (!el || el.dataset.words === "1") return el;
    const text = el.textContent;
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach(tok => {
      if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
      else {
        const w = document.createElement("span");
        w.className = "word"; w.style.display = "inline-block"; w.style.whiteSpace="pre";
        w.textContent = tok; frag.appendChild(w);
      }
    });
    el.textContent = ""; el.appendChild(frag); el.dataset.words="1"; return el;
  }
  function splitToChars(el) {
    if (!el || el.dataset.chars === "1") return el;
    const words = splitToWords(el).querySelectorAll(".word");
    words.forEach(w => {
      const chars = [...w.textContent]; w.textContent = "";
      const wrap = document.createElement("span"); wrap.className="chars"; wrap.style.display="inline-block";
      chars.forEach(c => { const s=document.createElement("span"); s.className="char"; s.style.display="inline-block"; s.textContent=c; wrap.appendChild(s); });
      w.appendChild(wrap);
    });
    el.dataset.chars="1"; return el;
  }
  function isVisible(el){
    if(!el) return false;
    const cs=getComputedStyle(el);
    return cs.display!=="none" && cs.visibility!=="hidden";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try { await ensureGSAP(); } catch(e){ console.error(e); return; }

    // Elemente
    const title      = document.getElementById("aurora-crown");
    const subSnippet = document.querySelector("#aurora-chant .subtitle-snippet");
    const subT       = document.querySelector("#aurora-chant .subtitle-t");
    const subFull    = document.querySelector("#aurora-chant .subtitle-full");

    // 1) Titel sofort starten
    const master = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (title) {
      splitToChars(title);
      const tChars = qa(".char", title);
      gsap.set(tChars, { transformOrigin:"50% 70%", rotateX:55, yPercent:120, filter:"blur(6px)", autoAlpha:0 });
      master.to(tChars, {
        yPercent:0, rotateX:0, autoAlpha:1, filter:"blur(0px)",
        duration:0.6, stagger:{ each:0.012, from:"start" }
      }, 0);
    }

    // 2) Untertitel SOFORT nach Titelbeginn (Overlap), unabhängig von Karten
    const visibleSub = [subSnippet, subT, subFull].find(isVisible) || subFull || subT || subSnippet;
    if (visibleSub) {
      splitToWords(visibleSub);
      const w = qa(".word", visibleSub);
      gsap.set(visibleSub, { opacity: 1 }); // sofort sichtbar halten
      gsap.set(w, { yPercent: 40, autoAlpha: 0, skewY: 4 });

      // startet 0.12s nach Titel-Start (anpassbar)
      master.to(w, {
        yPercent: 0, autoAlpha: 1, skewY: 0,
        duration: 0.45, ease: "power2.out",
        stagger: { each: 0.03, from: "start" }
      }, 0.12);
    }

    // 3) Karten bleiben Scroll-getriggert (zeigen sich später beim Scroll)
    qa(".aether-card").forEach((card) => {
      // Heading per-char
      const h3 = card.querySelector("h3");
      if (h3) {
        splitToChars(h3);
        const c = qa("h3 .char", card);
        gsap.set(c, { yPercent:120, rotateX:50, autoAlpha:0, filter:"blur(4px)" });
        ScrollTrigger.create({
          trigger: card, start: "top 80%", once: true,
          onEnter: () => gsap.to(c, {
            yPercent:0, rotateX:0, autoAlpha:1, filter:"blur(0px)",
            duration:0.5, ease:"power3.out", stagger:{ each:0.01, from:"start" }
          })
        });
      }
      // Wortkaskade für Copy
      const texts = qa(".snippet, .t-snippet, .microtag, .delta-list li .copy, .delta-list li .lead", card);
      texts.forEach(el => splitToWords(el));
      const words = texts.flatMap(el => qa(".word", el));
      gsap.from(words, {
        yPercent: 28, autoAlpha: 0, skewY: 3, duration: 0.42, ease: "power2.out", stagger: 0.018,
        scrollTrigger: { trigger: card, start: "top 78%" }
      });
    });

    // Parallaxe (optional, beeinflusst Reihenfolge nicht)
    gsap.to("#aurora-sheet", {
      yPercent: -2, ease: "none",
      scrollTrigger: { trigger:"#aurora-sheet", start:"top bottom", end:"bottom top", scrub:0.5 }
    });
  });
})();

