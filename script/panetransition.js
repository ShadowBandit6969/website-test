/**
 * FLOWHUB v2.2 — Typo-Only, Mobile Circle Follow, Re-Trigger on Open
 * - Karten statisch (kein Pop / keine 3D-Effekte)
 * - Typo smooth: nur Opacity + leichter y, keine Blur-/Char-Splits
 * - Mobile: .card-num-giant folgt weich dem Scroll (quickTo)
 * - Bei jedem Öffnen einer Karte spielt deren Typo-Animation erneut ab
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

    h3:   { dur: 0.5,  start: "top 80%" },
    body: { dur: 0.55, start: "top 78%" },

    ioRootMargin: "8% 0px -8% 0px",
    openReplayDelay: 160
  };

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile  = () => window.matchMedia(`(max-width: ${CONFIG.mobileMax}px)`).matches;
  const isDesktop = () => window.matchMedia("(min-width:1025px)").matches;

  function loadScript(src){
    return new Promise((res, rej)=>{
      const s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error("Failed: "+src));
      document.head.appendChild(s);
    });
  }
  async function ensureGSAP(){
    if(!window.gsap) await loadScript(GSAP_CDN);
    if(!window.ScrollTrigger) await loadScript(ST_CDN);
    gsap.registerPlugin(ScrollTrigger);
  }

  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // ---- ScrollTrigger per Karte: nur Opacity + leichter y ----
  function createScrollTextForCard(card){
    if (!card._flowhubST) card._flowhubST = { h3:null, body:null };

    const h3 = card.querySelector("h3");
    if (h3){
      // Basis: leicht sichtbar, minimal versetzt
      gsap.set(h3, { opacity: 0.7, y: 6 });
      card._flowhubST.h3 = ScrollTrigger.create({
        trigger: card,
        start: CONFIG.h3.start,
        once: true,
        onEnter: () => {
          gsap.to(h3, {
            opacity: 1,
            y: 0,
            duration: CONFIG.h3.dur,
            ease: "power3.out"
          });
        }
      });
    }

    const textBits = qa(".m-snippet, .t-snippet, p:not(.m-snippet):not(.t-snippet)", card);
    if (textBits.length){
      gsap.set(textBits, { opacity: 0.7, y: 4 });
      const tween = gsap.to(textBits, {
        opacity: 1,
        y: 0,
        duration: CONFIG.body.dur,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger:{
          trigger: card,
          start: CONFIG.body.start
        }
      });
      card._flowhubST.body = tween.scrollTrigger;
    }
  }

  function killScrollTextForCard(card){
    if (card._flowhubST){
      Object.values(card._flowhubST).forEach(st => { try { st && st.kill(); } catch(_){} });
      card._flowhubST = null;
    }
  }

  // identische Typo beim Öffnen einer Karte (Desktop) erneut abspielen
  function playCardTextOnce(card, gsap){
    killScrollTextForCard(card);

    const h3 = card.querySelector("h3");
    const textBits = qa(".m-snippet, .t-snippet, p:not(.m-snippet):not(.t-snippet)", card);

    if (h3){
      gsap.killTweensOf(h3);
      gsap.set(h3, { opacity: 0.7, y: 6 });
      gsap.to(h3, {
        opacity: 1,
        y: 0,
        duration: CONFIG.h3.dur,
        ease: "power3.out"
      });
    }

    if (textBits.length){
      gsap.killTweensOf(textBits);
      gsap.set(textBits, { opacity: 0.7, y: 4 });
      gsap.to(textBits, {
        opacity: 1,
        y: 0,
        duration: CONFIG.body.dur,
        ease: "power2.out",
        stagger: 0.06
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (prefersReduced) return;
    try { await ensureGSAP(); } catch(e){ console.error(e); return; }

    const section = document.getElementById("flowhub");
    if (!section) return;

    const cards = qa(".flow-card", section);
    // Karten selbst sind immer „neutral“ sichtbar
    gsap.set(cards, { opacity:1, y:0, rotateX:0, rotateY:0, clearProps:"transform" });

    // Titel/Untertitel: nur Opacity + leichter y
    const titleEl    = section.querySelector(".pane-title");
    const subtitleEl = section.querySelector(".pane-subtitle");
    const master = gsap.timeline({ defaults:{ ease:"power3.out" } });

    if (titleEl){
      gsap.set(titleEl, { opacity: 0.7, y: 8 });
      master.to(titleEl, {
        opacity: 1,
        y: 0,
        duration: 0.55
      }, 0);
    }
    if (subtitleEl){
      gsap.set(subtitleEl, { opacity: 0.7, y: 10 });
      master.to(subtitleEl, {
        opacity: 1,
        y: 0,
        duration: 0.55
      }, 0.12);
    }

    // ScrollText:
    // Auf Desktop: keine ScrollTrigger, wir animieren bei Open
    // Mobile/Tablet: per ScrollTrigger (smooth Opacity-only)
    const expandModeAtBoot = isDesktop() && !prefersReduced;
    if (!expandModeAtBoot){
      cards.forEach(createScrollTextForCard);
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
    if (circles.length){
      window.addEventListener("scroll", onScrollOrResize, {passive:true});
      window.addEventListener("resize", onScrollOrResize);
      onScrollOrResize();
    }

    // Desktop Expand: Re-Trigger nur für geöffnete Karte, initial nur 1×
    (function(){
      const rail = document.querySelector('#flowhub .flow-rail');
      if(!rail) return;

      const cards = Array.from(rail.querySelectorAll('.flow-card'));
      const rootEl = document.documentElement;
      const root   = document.getElementById('flowhub');

      const mqDesktop = window.matchMedia('(min-width:1025px)');
      const expandMode = mqDesktop.matches && !prefersReduced;
      if (!expandMode) return; // mobile/tablet: ScrollTrigger kümmert sich

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

    // Nummerierung NICHT mehr hier, wird unten zentral gemacht
  });
})();



// MOBILE TIMELINE-TRACKER (links) – folgt dem Scroll sanft
// Erwartet CSS: .flow-rail setzt --tracker-y; der Kreis hängt an ::after (top: var(--tracker-y))
(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const MQ_MOBILE = window.matchMedia("(max-width: 699.98px)");
  const root      = document.getElementById("flowhub");
  if (!root) return;

  const rail = root.querySelector(".flow-rail");
  if (!rail) return;

  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let setTargetY;
  (function makeSmoothSetter(){
    const setCSS = (y)=> rail.style.setProperty("--tracker-y", `${y}px`);

    if (window.gsap) {
      const proxy = { y: 0 };
      const yTo = gsap.quickTo(proxy, "y", { duration: 0.18, ease: "power1.out", onUpdate(){ setCSS(proxy.y); } });
      setTargetY = (y)=> yTo(y);
    } else {
      let cur = 0, raf = null;
      const tick = ()=>{
        raf = null;
        cur += (setTargetY._t - cur) * 0.22;
        if (Math.abs(cur - setTargetY._t) > 0.5) raf = requestAnimationFrame(tick);
        setCSS(cur);
      };
      setTargetY = (y)=>{ setTargetY._t = y; if (!raf) raf = requestAnimationFrame(tick); };
      setTargetY._t = 0;
    }
  })();

  let cards = qa(".flow-card", rail);

  function computeTrackerY() {
    if (!MQ_MOBILE.matches) return;
    const railRect = rail.getBoundingClientRect();
    const viewMid  = (window.innerHeight || document.documentElement.clientHeight) * 0.5;

    let best = null, bestDist = Infinity;

    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;

      const cardMidInViewport = r.top + r.height / 2;
      const dist = Math.abs(cardMidInViewport - viewMid);
      if (dist < bestDist) {
        bestDist = dist;
        best = cardMidInViewport - railRect.top;
      }
    }

    if (best == null) {
      const raw = viewMid - railRect.top;
      best = raw;
    }

    const y = clamp(best, 0, Math.max(0, railRect.height));
    setTargetY(y);
  }

  let rafId = null;
  function onScrollOrResize() {
    if (!MQ_MOBILE.matches) return;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      computeTrackerY();
    });
  }

  const mo = new MutationObserver(() => {
    cards = qa(".flow-card", rail);
    computeTrackerY();
  });
  mo.observe(rail, { childList: true, subtree: true });

  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", () => { computeTrackerY(); });

  MQ_MOBILE.addEventListener("change", () => {
    if (MQ_MOBILE.matches) computeTrackerY();
    else rail.style.setProperty("--tracker-y", `0px`);
  });

  computeTrackerY();
})();




// FLOWHUB: Nummerierung + Nudge + Desktop-Expand (bestehend, leicht bereinigt)
document.addEventListener('DOMContentLoaded', () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.gsap) {
    const { gsap } = window;
    gsap.registerPlugin(window.ScrollTrigger || {});

    const cardsList = Array.from(document.querySelectorAll('#flowhub .flow-card'));

    // === Nummerierung 00-basiert (00, 01, 02, ...) ===
    cardsList.forEach((card, i) => {
      const nn = String(i).padStart(2, '0');
      card.setAttribute('data-stage', nn);
      const small = card.querySelector('.card-num');
      const giant = card.querySelector('.card-num-giant');
      if (small) small.textContent = nn;
      if (giant) giant.textContent = nn;
    });

    // Baseline: Karten neutral
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
          startNudge();
        } else {
          stopNudge();
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
          openAt(Math.max(0,selectedIdx,0));
          root?.classList.add('booted');
          if(railInView){ planNext(); startNudge(); }
        }
      }

      mqDesktop.addEventListener('change', applyMode);
      window.addEventListener('resize', () => { if(expandMode) syncHeightFromFirst(); });

      applyMode();
      if (expandMode) { openAt(0); root?.classList.add('booted'); }
    })();
  }
});
