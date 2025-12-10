(function () {
  const GSAP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  const ST_CDN   = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error("Failed: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureGSAP() {
    if (!window.gsap) await loadScript(GSAP_CDN);
    if (!window.ScrollTrigger) await loadScript(ST_CDN);
    gsap.registerPlugin(ScrollTrigger);
  }

  const qa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  // Satz-Splitter: wrappt Sätze in <span class="sentence">…</span>
  function splitSentences(el) {
    if (!el) return [];
    if (el.dataset.sentences === "1") return qa(".sentence", el);

    const original = el.textContent || "";
    if (!original.trim()) return [];

    el.setAttribute("aria-label", original);
    el.setAttribute("role", "text");

    const parts = original.match(/[^.!?]+[.!?]*\s*/g) || [original];

    el.textContent = "";
    parts.forEach(part => {
      const span = document.createElement("span");
      span.className = "sentence";
      span.textContent = part;
      el.appendChild(span);
    });

    el.dataset.sentences = "1";
    return qa(".sentence", el);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await ensureGSAP();
    } catch (e) {
      console.error(e);
      return;
    }

    // Elemente
    const title      = document.getElementById("aurora-crown");
    const subSnippet = document.querySelector("#aurora-chant .subtitle-snippet");
    const subT       = document.querySelector("#aurora-chant .subtitle-t");
    const subFull    = document.querySelector("#aurora-chant .subtitle-full");

    // Master-Timeline für Titel + Untertitel (ohne Scroll)
    const master = gsap.timeline({ defaults: { ease: "power1.out" } });

    // 1) Titel – satzweise Opacity 0.7 → 1
    if (title) {
      const tSentences = splitSentences(title);

      if (tSentences.length) {
        gsap.set(tSentences, { opacity: 0.7 });
        master.to(tSentences, {
          opacity: 1,
          stagger: 0.25,
          duration: 0.6
        }, 0);
      } else {
        // Fallback: Titel einfach voll sichtbar machen
        gsap.set(title, { opacity: 1 });
      }
    }

    // 2) Untertitel – sichtbare Variante wählen, satzweise Opacity
    const visibleSub = [subSnippet, subT, subFull].find(isVisible) || subFull || subT || subSnippet;
    if (visibleSub) {
      const subSentences = splitSentences(visibleSub);
      if (subSentences.length) {
        gsap.set(subSentences, { opacity: 0.7 });
        master.to(subSentences, {
          opacity: 1,
          stagger: 0.25,
          duration: 0.5
        }, 0.2); // leicht verzögert nach Titel
      } else {
        gsap.set(visibleSub, { opacity: 1 });
      }
    }

    // 3) Karten – scrollgetriggert, satzweise / punktweise Opacity
    qa(".aether-card").forEach((card) => {
      ScrollTrigger.create({
        trigger: card,
        start: "top 80%",
        once: true,
        onEnter: () => {
          const h3 = card.querySelector("h3");

          // Textblöcke innerhalb der Karte
          const copyBlocks = qa(
            ".snippet, .t-snippet, .microtag, .delta-list li .copy, .delta-list li .lead",
            card
          );
          const liEls = qa(".delta-list li", card);

          // Titel satzweise
          const titleSentences = h3 ? splitSentences(h3) : [];
          if (titleSentences.length) {
            gsap.set(titleSentences, { opacity: 0.7 });
          } else if (h3) {
            gsap.set(h3, { opacity: 0.7 });
          }

          // Copy-Blöcke satzweise
          const copySentencesList = copyBlocks.map(el => splitSentences(el));
          copySentencesList.forEach((sentences, idx) => {
            if (sentences.length) {
              gsap.set(sentences, { opacity: 0.7 });
            } else if (copyBlocks[idx]) {
              gsap.set(copyBlocks[idx], { opacity: 0.7 });
            }
          });

          // Listenpunkte als eigene Einheiten (ein Punkt nach dem anderen)
          if (liEls.length) {
            gsap.set(liEls, { opacity: 0.7 });
          }

          let delayBase = 0;

          // Animation Titel
          if (titleSentences.length) {
            gsap.to(titleSentences, {
              opacity: 1,
              stagger: 0.25,
              duration: 0.45,
              ease: "power1.out",
              delay: delayBase
            });
            delayBase += 0.2;
          } else if (h3) {
            gsap.to(h3, {
              opacity: 1,
              duration: 0.35,
              ease: "power1.out",
              delay: delayBase
            });
            delayBase += 0.1;
          }

          // Animation Copy-Blöcke
          copySentencesList.forEach((sentences, idx) => {
            const blockDelay = delayBase + idx * 0.1;
            if (sentences.length) {
              gsap.to(sentences, {
                opacity: 1,
                stagger: 0.2,
                duration: 0.4,
                ease: "power1.out",
                delay: blockDelay
              });
            } else if (copyBlocks[idx]) {
              gsap.to(copyBlocks[idx], {
                opacity: 1,
                duration: 0.35,
                ease: "power1.out",
                delay: blockDelay
              });
            }
          });

          // Listenpunkte
          if (liEls.length) {
            gsap.to(liEls, {
              opacity: 1,
              duration: 0.4,
              stagger: 0.15,
              ease: "power1.out",
              delay: delayBase + copySentencesList.length * 0.1
            });
          }

          // Safety-Fallback: nach kurzer Zeit einfach alles voll sichtbar
          const allBlocks = [
            h3,
            ...copyBlocks,
            ...liEls
          ].filter(Boolean);

          if (allBlocks.length) {
            gsap.to(allBlocks, {
              opacity: 1,
              duration: 0.01,
              delay: 1.2
            });
          }
        }
      });
    });

    // (Parallaxe o.ä. kannst du hier bei Bedarf wieder hinzufügen – 
    // sollte aber auch ohne komplexe Effekte flüssig laufen.)
  });
})();
