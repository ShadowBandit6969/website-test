


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
