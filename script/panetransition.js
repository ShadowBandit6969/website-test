
/**
 * FLOWHUB v2.1 — Typo-Only, Mobile Circle Follow, Re-Trigger on Open
 * - Karten statisch (keine Reveals/Tilt/Pop)
 * - Typo smooth (curved stagger, micro-overshoot, soft blur)
 * - Mobile: .card-num-giant folgt weich dem Scroll (quickTo)
 * - NEU: Bei jedem Öffnen einer Karte spielt deren Typo-Animation erneut ab
 */
(function () {
  const GSAP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  const ST_CDN   = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";

  const CONFIG = {
    mobileMax: 1024,
    circleSelector: ".card-num-giant",
    circleRangePx: 72,
    circleFollowDur: 0.55,
    circleFollowEase: "power3.out",

    title: { dur: 0.6,  charStagger: 0.012 },
    sub:   { dur: 0.45, wordStagger: 0.03, startOverlap: 0.12 },

    h3:   { dur: 0.5,  charStagger: 0.01,  start: "top 80%" },
    body: { dur: 0.42, wordStagger: 0.018, start: "top 78%" },

    ioRootMargin: "8% 0px -8% 0px",
    openReplayDelay: 160
  };

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile  = () => window.matchMedia(`(max-width: ${CONFIG.mobileMax}px)`).matches;
  const isDesktop = () => window.matchMedia("(min-width:1025px)").matches;

  function loadScript(src){
    return new Promise((res, rej)=>{
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed: "+src));
      document.head.appendChild(s);
    });
  }
  async function ensureGSAP(){
    if(!window.gsap) await loadScript(GSAP_CDN);
    if(!window.ScrollTrigger) await loadScript(ST_CDN);
    gsap.registerPlugin(ScrollTrigger);
  }

  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  function splitToWords(el){
    if(!el || el.dataset.words==="1") return el;
    const text = el.textContent;
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach(tok=>{
      if(/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
      else {
        const w = document.createElement("span");
        w.className="word"; w.style.display="inline-block"; w.style.whiteSpace="pre";
        w.textContent = tok; frag.appendChild(w);
      }
    });
    el.textContent=""; el.appendChild(frag); el.dataset.words="1"; return el;
  }
  function splitToChars(el){
    if(!el || el.dataset.chars==="1") return el;
    const words = splitToWords(el).querySelectorAll(".word");
    words.forEach(w=>{
      const chars=[...w.textContent]; w.textContent="";
      const wrap=document.createElement("span"); wrap.className="chars"; wrap.style.display="inline-block";
      chars.forEach(c=>{ const s=document.createElement("span"); s.className="char"; s.style.display="inline-block"; s.textContent=c; wrap.appendChild(s); });
      w.appendChild(wrap);
    });
    el.dataset.chars="1"; return el;
  }

  // ---- ScrollTrigger per Karte anlegen/killen (um Doppeltrigger zu vermeiden) ----
  function createScrollTextForCard(card){
    // bewahre Trigger-Referenzen am Element
    if (!card._flowhubST) card._flowhubST = { h3:null, body:null };

    // h3
    const h3 = card.querySelector("h3");
    if (h3){
      splitToChars(h3);
      const c = qa("h3 .char", card);
      gsap.set(c, { yPercent:120, rotateX:50, autoAlpha:0, filter:"blur(4px)" });
      card._flowhubST.h3 = ScrollTrigger.create({
        trigger: card, start: CONFIG.h3.start, once: true,
        onEnter: () => gsap.to(c, {
          yPercent:0, rotateX:0, autoAlpha:1, filter:"blur(0px)",
          duration:CONFIG.h3.dur, ease:"power3.out",
          stagger:{ each:CONFIG.h3.charStagger, from:"start" }
        })
      });
    }

    // Body
    const textBits = qa(".m-snippet, .t-snippet, p:not(.m-snippet):not(.t-snippet)", card);
    textBits.forEach(el=>splitToWords(el));
    const words = textBits.flatMap(el=>qa(".word", el));
    if (words.length){
      card._flowhubST.body = gsap.from(words, {
        yPercent:28, autoAlpha:0, skewY:3,
        duration:CONFIG.body.dur, ease:"power2.out",
        stagger:CONFIG.body.wordStagger,
        scrollTrigger:{ trigger: card, start: CONFIG.body.start }
      }).scrollTrigger;
    }
  }
  function killScrollTextForCard(card){
    if (card._flowhubST){
      Object.values(card._flowhubST).forEach(st => { try { st && st.kill(); } catch(_){} });
      card._flowhubST = null;
    }
  }

  // identische Typo sofort abspielen (für openAt & initial offene Karte)
  function playCardTextOnce(card, gsap){
    // kill evtl. vorhandene ScrollTrigger dieser Karte, sonst doppelter Start
    killScrollTextForCard(card);

    const chars = qa("h3 .char", card);
    if (chars.length){
      gsap.killTweensOf(chars);
      gsap.set(chars, { yPercent:120, rotateX:50, autoAlpha:0, filter:"blur(4px)", transformOrigin:"50% 70%" });
      gsap.to(chars, {
        yPercent:0, rotateX:0, autoAlpha:1, filter:"blur(0px)",
        duration:CONFIG.h3.dur, ease:"power3.out",
        stagger:{ each:CONFIG.h3.charStagger, from:"start" }
      });
    }
    const words = qa(".m-snippet .word, .t-snippet .word, p .word", card);
    if (words.length){
      gsap.killTweensOf(words);
      gsap.from(words, {
        yPercent:28, autoAlpha:0, skewY:3,
        duration:CONFIG.body.dur, ease:"power2.out",
        stagger:CONFIG.body.wordStagger
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (prefersReduced) return;
    try { await ensureGSAP(); } catch(e){ console.error(e); return; }

    const section = document.getElementById("flowhub");
    if (!section) return;

    const cards = qa(".flow-card", section);
    gsap.set(cards, { opacity:1, y:0, rotateX:0, rotateY:0, clearProps:"transform" });

    // Titel/Untertitel wie im Referenz-Beispiel
    const titleEl    = section.querySelector(".pane-title");
    const subtitleEl = section.querySelector(".pane-subtitle");
    const master = gsap.timeline({ defaults:{ ease:"power3.out" } });

    if (titleEl){
      splitToChars(titleEl);
      const tChars = qa(".char", titleEl);
      gsap.set(tChars, { transformOrigin:"50% 70%", rotateX:55, yPercent:120, filter:"blur(6px)", autoAlpha:0 });
      master.to(tChars, {
        yPercent:0, rotateX:0, autoAlpha:1, filter:"blur(0px)",
        duration:CONFIG.title.dur, stagger:{ each:CONFIG.title.charStagger, from:"start" }
      }, 0);
    }
    if (subtitleEl){
      splitToWords(subtitleEl);
      const w = qa(".word", subtitleEl);
      gsap.set(subtitleEl, { opacity:1 });
      gsap.set(w, { yPercent:40, autoAlpha:0, skewY:4 });
      master.to(w, {
        yPercent:0, autoAlpha:1, skewY:0,
        duration:CONFIG.sub.dur, ease:"power2.out",
        stagger:{ each:CONFIG.sub.wordStagger, from:"start" }
      }, CONFIG.sub.startOverlap);
    }

    // === WICHTIG: ScrollTrigger nur auf Nicht-Desktop (kein Expand) -> verhindert Glitch der ersten Karte
    const expandModeAtBoot = isDesktop() && !prefersReduced;
    if (!expandModeAtBoot){
      cards.forEach(createScrollTextForCard);
    } else {
      // kein ScrollTrigger am Desktop anlegen (wir spielen on-open)
      cards.forEach(card=>{
        // Nur vorbereiten, kein ST
        const h3 = card.querySelector("h3"); if (h3) splitToChars(h3);
        qa(".m-snippet, .t-snippet, p:not(.m-snippet):not(.t-snippet)", card).forEach(el=>splitToWords(el));
      });
    }

    // Mobile Kreis folgt Scroll
    const circles = cards.map(card => {
      const el = card.querySelector(CONFIG.circleSelector);
      return el ? { card, el } : null;
    }).filter(Boolean);
    circles.forEach(({el}) => { el.style.willChange = "transform"; });
    const circleControllers = circles.map(({el}) => ({
      el, yTo: gsap.quickTo(el, "y", { duration: CONFIG.circleFollowDur, ease: CONFIG.circleFollowEase })
    }));
    function clamp(v,a,b){ return Math.min(b, Math.max(a,v)); }
    let rafId=null;
    function updateCircles(){
      rafId=null;
      if (!isMobile()) { circleControllers.forEach(({yTo})=>yTo(0)); return; }
      const vh = window.innerHeight || 1;
      circles.forEach(({card}, idx)=>{
        const r = card.getBoundingClientRect();
        if (!(r.bottom>0 && r.top<vh)) return;
        const prog = clamp((vh - r.top) / (vh + r.height), 0, 1);
        circleControllers[idx].yTo((prog - 0.5) * CONFIG.circleRangePx);
      });
    }
    function onScrollOrResize(){ if(rafId!==null) return; rafId=requestAnimationFrame(updateCircles); }
    if (circles.length){ window.addEventListener("scroll", onScrollOrResize, {passive:true}); window.addEventListener("resize", onScrollOrResize); onScrollOrResize(); }

    // Desktop Expand: Re-Trigger nur für geöffnete Karte, und initial nur 1×
    (function(){
      const rail = document.querySelector('#flowhub .flow-rail');
      if(!rail) return;

      const cards = Array.from(rail.querySelectorAll('.flow-card'));
      const rootEl = document.documentElement;
      const root   = document.getElementById('flowhub');

      const mqDesktop = window.matchMedia('(min-width:1025px)');
      const expandMode = mqDesktop.matches && !prefersReduced;
      if (!expandMode) return; // mobile/tablet: ST kümmert sich

      function syncHeightFromFirst(){
        const first=cards[0]; if(!first) return;
        const wasOpen=first.classList.contains('is-open');
        if(!wasOpen) first.classList.add('is-open');
        const h=first.getBoundingClientRect().height;
        rootEl.style.setProperty('--tile-h', (h||0)+'px');
        if(!wasOpen) first.classList.remove('is-open');
      }

      function openAt(idx){
        if(idx<0||idx>=cards.length) return;
        cards.forEach((c,i)=>{
          const open=i===idx;
          c.classList.toggle('is-open',open);
          c.setAttribute('aria-expanded',open?'true':'false');
        });
        if(idx===0) syncHeightFromFirst();

        const openedCard = cards[idx];
        // sicherstellen: keine STs auf dieser Karte -> keine Doppeltrigger
        killScrollTextForCard(openedCard);
        setTimeout(()=> playCardTextOnce(openedCard, gsap), CONFIG.openReplayDelay);
      }

      // Initial: finde bereits offene Karte, spiele EINMAL, ohne ST
      let booted=false;
      const io=new IntersectionObserver((entries)=>{
        const entry=entries[0];
        const inView = entry.isIntersecting && entry.intersectionRatio>=0.5;
        if (!inView || booted) return;
        booted=true;

        const initialIdx = cards.findIndex(c=>c.classList.contains('is-open'));
        if (initialIdx === -1) {
          openAt(0);
        } else {
          // Klassenlage respektieren, nur Typo einmalig
          if (initialIdx===0) syncHeightFromFirst();
          const opened = cards[initialIdx];
          killScrollTextForCard(opened);
          setTimeout(()=> playCardTextOnce(opened, gsap), CONFIG.openReplayDelay);
        }
        root?.classList.add('booted');
      },{threshold:[0,0.5,1]});
      io.observe(rail);

      // Click/Keyboard
      cards.forEach((c,i)=>{
        c.addEventListener('click', ()=> openAt(i));
        c.addEventListener('keydown', e=>{
          if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openAt(i); }
        });
      });
    })();

    // Nummerierung
    qa('#flowhub .flow-card').forEach((card, i)=>{
      const nn = String(i).padStart(2, '0');
      card.setAttribute('data-stage', nn);
      const small = card.querySelector('.card-num');
      const giant = card.querySelector('.card-num-giant');
      if (small) small.textContent = nn;
      if (giant) giant.textContent = nn;
    });
  });
})();





// MOBILE TIMELINE-TRACKER (links) – folgt dem Scroll sanft
// Erwartet CSS aus deiner Datei: .flow-rail setzt --tracker-y; der Kreis hängt an ::after (top: var(--tracker-y))
(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const MQ_MOBILE = window.matchMedia("(max-width: 699.98px)");
  const root      = document.getElementById("flowhub");
  if (!root) return;

  const rail = root.querySelector(".flow-rail");
  if (!rail) return;

  // Helper
  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Smooth setter: nutzt GSAP wenn vorhanden, sonst fallback mit rAF/lerp
  let setTargetY;
  (function makeSmoothSetter(){
    const setCSS = (y)=> rail.style.setProperty("--tracker-y", `${y}px`);

    if (window.gsap) {
      const proxy = { y: 0 };
      const yTo = gsap.quickTo(proxy, "y", { duration: 0.18, ease: "power1.out", onUpdate(){ setCSS(proxy.y); } });
      setTargetY = (y)=> yTo(y);
    } else {
      // leichter, performanter Fallback
      let cur = 0, raf = null;
      const tick = ()=>{
        raf = null;
        cur += (setTargetY._t - cur) * 0.22; // weiches Nachziehen
        if (Math.abs(cur - setTargetY._t) > 0.5) raf = requestAnimationFrame(tick);
        setCSS(cur);
      };
      setTargetY = (y)=>{ setTargetY._t = y; if (!raf) raf = requestAnimationFrame(tick); };
      setTargetY._t = 0;
    }
  })();

  // Karten sammeln
  let cards = qa(".flow-card", rail);

  function computeTrackerY() {
    if (!MQ_MOBILE.matches) return; // nur mobil aktiv
    const railRect = rail.getBoundingClientRect();
    const viewMid  = (window.innerHeight || document.documentElement.clientHeight) * 0.5;

    // Finde die Karte, deren Mittelpunkt dem Viewport-Center am nächsten ist
    let best = null, bestDist = Infinity;

    for (const card of cards) {
      const r = card.getBoundingClientRect();
      // nur berücksichtigen, wenn die Karte in/nahe im Viewport ist
      if (r.bottom < 0 || r.top > window.innerHeight) continue;

      const cardMidInViewport = r.top + r.height / 2;
      const dist = Math.abs(cardMidInViewport - viewMid);
      if (dist < bestDist) {
        bestDist = dist;
        // Y relativ zur Rail (für die CSS-Variable)
        best = cardMidInViewport - railRect.top;
      }
    }

    // Falls keine Karte sichtbar ist: lineares Clamping entlang der Rail anhand viewport center
    if (best == null) {
      const raw = viewMid - railRect.top;
      best = raw;
    }

    // Innerhalb der Rail halten
    const y = clamp(best, 0, Math.max(0, railRect.height));
    setTargetY(y);
  }

  // rAF-Debounce
  let rafId = null;
  function onScrollOrResize() {
    if (!MQ_MOBILE.matches) return; // nur mobil
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      computeTrackerY();
    });
  }

  // Beobachte Struktur-Änderungen (z. B. Bilder laden → Höhen ändern)
  const mo = new MutationObserver(() => {
    cards = qa(".flow-card", rail);
    computeTrackerY();
  });
  mo.observe(rail, { childList: true, subtree: true });

  // Events
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", () => { computeTrackerY(); });

  // MediaQuery Wechsel: Variable zurücksetzen/neu berechnen
  MQ_MOBILE.addEventListener("change", () => {
    if (MQ_MOBILE.matches) computeTrackerY();
    else rail.style.setProperty("--tracker-y", `0px`);
  });

  // Initial
  computeTrackerY();
})();









  document.addEventListener('DOMContentLoaded', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (window.gsap) {
      // ScrollTrigger wird NICHT mehr verwendet (Scroll-Reveal entfernt),
      // Registrierung ist aber unschädlich, falls du später wieder willst.
      gsap.registerPlugin(window.ScrollTrigger || {});

      const cardsList = Array.from(document.querySelectorAll('#flowhub .flow-card'));

      // === Nummerierung 00-basiert (00, 01, 02, ...) ===
      cardsList.forEach((card, i) => {
        const nn = String(i).padStart(2, '0');
        card.setAttribute('data-stage', nn); // für ::after
        const small = card.querySelector('.card-num');
        const giant = card.querySelector('.card-num-giant');
        if (small) small.textContent = nn;
        if (giant) giant.textContent = nn;
      });

      // === KEIN Scroll-Reveal mehr: Basiszustand sofort sichtbar/neutral ===
      gsap.set(cardsList, { opacity: 1, y: 0 });

      // === Nudge (Doppel-Stups) der zweiten Karte, zyklisch — bleibt erhalten ===
      const isDesktop = () => window.matchMedia('(min-width: 1025px)').matches;
      let nudgeInterval = null;
      let nudgeTl = null;

      function clearNudgeTl() {
        if (nudgeTl) { nudgeTl.kill(); nudgeTl = null; }
        if (cardsList[1]) gsap.set(cardsList[1], { y: 0 });
      }

      function stopNudge() {
        if (nudgeInterval) {
          clearInterval(nudgeInterval);
          nudgeInterval = null;
        }
        clearNudgeTl();
      }

      function makeNudge(target, amp = 10) {
        // zwei leichte Stupser
        const tl = gsap.timeline({ defaults: { clearProps: false } });
        tl.to(target, { y: -amp, duration: 0.16, ease: 'power1.out' })
          .to(target, { y: 0, duration: 0.20, ease: 'power2.out' }, '+=0.02')
          .to(target, { y: -(amp * 0.7), duration: 0.14, ease: 'power1.out' }, '+=0.18')
          .to(target, { y: 0, duration: 0.18, ease: 'power2.out' });
        return tl;
      }

      function startNudge() {
        if (prefersReduced || nudgeInterval || !isDesktop() || !cardsList[1]) return;
        nudgeInterval = setInterval(() => {
          clearNudgeTl();
          nudgeTl = makeNudge(cardsList[1], 10);
        }, 7000);
      }

      // === Expand/Auto-Cycle nur auf Desktop — bleibt erhalten ===
      (function(){
        const rail = document.querySelector('#flowhub .flow-rail');
        if(!rail) return;
        const cards = Array.from(rail.querySelectorAll('.flow-card'));
        const rootEl = document.documentElement;
        const root = document.getElementById('flowhub');
        let autoId=null,selectedIdx=-1,railInView=false,booted=false;

        const mqDesktop = window.matchMedia('(min-width:1025px)');
        let expandMode = mqDesktop.matches && !prefersReduced;

        function syncHeightFromFirst(){
          const first=cards[0];
          if(!first) return;
          const wasOpen=first.classList.contains('is-open');
          if(!wasOpen) first.classList.add('is-open');
          const h=first.getBoundingClientRect().height;
          rootEl.style.setProperty('--tile-h', (h||0)+'px');
          if(!wasOpen) first.classList.remove('is-open');
        }

        function openAt(idx){
          if(!expandMode) return;
          if(idx<0||idx>=cards.length) return;
          selectedIdx=idx;
          stopNudge();
          cards.forEach((c,i)=>{
            const open=i===idx;
            c.classList.toggle('is-open',open);
            c.setAttribute('aria-expanded',open?'true':'false');
          });
          if(idx===0) syncHeightFromFirst();
        }

        function clearAutoCycle(){ if(autoId){ clearTimeout(autoId); autoId=null; } }
        function planNext(delayMs=18000){
          if(!expandMode) return;
          clearAutoCycle();
          if(!railInView) return;
          autoId=setTimeout(()=>{
            if(!railInView) return;
            const next=(selectedIdx+1)%cards.length;
            openAt(next);
            planNext(delayMs);
          },delayMs);
        }

        cards.forEach((c,i)=>{
          c.addEventListener('click',()=>{ if(!expandMode) return; stopNudge(); openAt(i); planNext(); });
          c.addEventListener('keydown',e=>{
            if(!expandMode) return;
            if(e.key==='Enter'||e.key===' '){ e.preventDefault(); stopNudge(); openAt(i); planNext(); }
          });
        });

        const io=new IntersectionObserver((entries)=>{
          const entry=entries[0];
          railInView=entry.isIntersecting && entry.intersectionRatio>=0.5;
          if(!expandMode) return;
          if(railInView){
            if(!booted){ booted=true; openAt(0); planNext(); root.classList.add('booted'); }
            else { planNext(); }
            startNudge(); // Sichtbar + Desktop -> Nudge starten
          } else {
            stopNudge();  // nicht sichtbar -> pausieren
          }
        },{threshold:[0,0.5,1]});
        io.observe(rail);

        function applyMode(){
          expandMode = mqDesktop.matches && !prefersReduced;
          if (root){
            root.classList.toggle('is-enhanced', expandMode);
          }
          if(!expandMode){
            clearAutoCycle();
            cards.forEach(c=>{ c.classList.add('is-open'); c.setAttribute('aria-expanded','true'); });
            rootEl.style.setProperty('--tile-h','auto');
            stopNudge();
            root?.classList.remove('booted');
          }else{
            cards.forEach(c=>{ c.classList.remove('is-open'); c.setAttribute('aria-expanded','false'); });
            openAt(Math.max(0,selectedIdx,0)); // sofort öffnen
            root?.classList.add('booted');     // Boot-Modus aktivieren
            if(railInView){ planNext(); startNudge(); }
          }
        }

        mqDesktop.addEventListener('change', applyMode);
        window.addEventListener('resize', () => { if(expandMode) syncHeightFromFirst(); });

        applyMode();

        // Doppelt absichern: beim Laden direkt öffnen falls Desktop
        if (expandMode) { openAt(0); root?.classList.add('booted'); }
      })();
    }
  });
