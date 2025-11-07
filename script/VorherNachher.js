(function(){
  const sec  = document.getElementById('vorher-nachher');
  if(!sec) return;

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Utilities =====
  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v,a=0,b=100) => Math.max(a, Math.min(b, v));
  const easeCubic = t => t<0 ? 0 : t>1 ? 1 : (t*=2, t<1 ? .5*t*t*t : .5*((t-=2)*t*t+2));

  // Splitter (erhält Whitespaces & markups, splittet nur reine Textknoten)
  function splitToWords(el){
    if(!el || el.dataset.dsWords === '1') return el;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(n){ return n.nodeValue && n.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    for(const node of nodes){
      const frag = document.createDocumentFragment();
      const parts = node.nodeValue.split(/(\s+)/); // Spaces behalten
      for(const part of parts){
        if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); }
        else{
          const w = document.createElement('span');
          w.className = 'ds-word';
          w.style.display = 'inline-block';
          w.style.whiteSpace = 'pre';
          w.textContent = part;
          frag.appendChild(w);
        }
      }
      node.parentNode.replaceChild(frag, node);
    }
    el.dataset.dsWords = '1';
    return el;
  }
  function splitToChars(el){
    if(!el || el.dataset.dsChars === '1') return el;
    splitToWords(el);
    el.querySelectorAll('.ds-word').forEach(w=>{
      const text = w.textContent; w.textContent = '';
      const wrap = document.createElement('span');
      wrap.className = 'ds-chars';
      wrap.style.display = 'inline-block';
      for(const ch of text){
        const s = document.createElement('span');
        s.className = 'ds-char';
        s.style.display = 'inline-block';
        s.textContent = ch;
        wrap.appendChild(s);
      }
      w.appendChild(wrap);
    });
    el.dataset.dsChars = '1';
    return el;
  }

  // Reveal-Helfer (nutzt nur CSS-Styles, kein GSAP erforderlich)
  function revealChars(chars, {duration=520, stagger=9, blur=6, y=120, delay=0}={}){
    if(!chars || !chars.length) return;
    if(REDUCE){ chars.forEach(c=>{ c.style.opacity=1; c.style.transform='none'; c.style.filter='none'; }); return; }
    const start = performance.now() + delay;
    chars.forEach((c,i)=>{
      c.style.opacity = 0;
      c.style.filter = `blur(${blur}px)`;
      c.style.transform = `translateY(${y}%) rotateX(40deg)`;
      const t0 = start + i*stagger;
      const run = (now)=>{
        const p = (now - t0) / duration;
        if(p<=0){ requestAnimationFrame(run); return; }
        const e = easeCubic(Math.min(1,p));
        c.style.opacity = e;
        c.style.filter = `blur(${(1-e)*blur}px)`;
        c.style.transform = `translateY(${(1-e)*y}%) rotateX(${(1-e)*40}deg)`;
        if(p<1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    });
  }
  function revealWords(words, {duration=440, stagger=18, blur=5, y=38, delay=120}={}){
    if(!words || !words.length) return;
    if(REDUCE){ words.forEach(w=>{ w.style.opacity=1; w.style.transform='none'; w.style.filter='none'; }); return; }
    const start = performance.now() + delay;
    words.forEach((w,i)=>{
      w.style.opacity=0; w.style.filter=`blur(${blur}px)`; w.style.transform=`translateY(${y}%) skewY(4deg)`;
      const t0 = start + i*stagger;
      const run = (now)=>{
        const p = (now - t0) / duration;
        if(p<=0){ requestAnimationFrame(run); return; }
        const e = easeCubic(Math.min(1,p));
        w.style.opacity = e;
        w.style.filter = `blur(${(1-e)*blur}px)`;
        w.style.transform = `translateY(${(1-e)*y}%) skewY(${(1-e)*4}deg)`;
        if(p<1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    });
  }

  // ===== Elemente
  const headTitle = sec.querySelector('.aurora-title');
  const headSub   = sec.querySelector('.aurora-subtitle .subtitle-full') || sec.querySelector('.aurora-subtitle .subtitle-short');
  const stage     = sec.querySelector('.compare-stage');
  const beforeImg = stage.querySelector('.img-before');
  const afterImg  = stage.querySelector('.img-after');
  const divider   = stage.querySelector('.divider');
  const handle    = stage.querySelector('.handle');

  // ===== Compare core (dein Original – minimal verfeinert)
  const setSplit = p => {
    p = clamp(p);
    beforeImg.style.setProperty('--split', p+'%');
    divider.style.left = `calc(${p}% )`;
    handle.style.left  = p+'%';
    handle.setAttribute('aria-valuenow', p);
    stage.dataset.split = p;
  };
  setSplit(50);

  const rectToPct = x => {
    const r = stage.getBoundingClientRect();
    return ((x - r.left) / r.width) * 100;
  };

  let dragging = false;
  stage.addEventListener('pointerdown', e => {
    dragging = true; stage.setPointerCapture(e.pointerId);
    setSplit(rectToPct(e.clientX));
  });
  stage.addEventListener('pointermove', e => dragging && setSplit(rectToPct(e.clientX)));
  stage.addEventListener('pointerup',   e => { dragging = false; stage.releasePointerCapture(e.pointerId); });
  stage.addEventListener('pointercancel', () => dragging = false);
  handle.addEventListener('pointerdown', e => e.stopPropagation());
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 2;
    const curr = Number(stage.dataset.split) || 50;
    if(e.key==='ArrowLeft'){ e.preventDefault(); setSplit(curr - step); }
    if(e.key==='ArrowRight'){ e.preventDefault(); setSplit(curr + step); }
    if(e.key==='Home'){ e.preventDefault(); setSplit(0); }
    if(e.key==='End'){  e.preventDefault(); setSplit(100); }
  });

  // Bilder soft einblenden (kein hartes Poppen)
  [beforeImg, afterImg].forEach(img=>{
    const show = ()=>{ img.style.opacity='1'; img.style.transition='opacity .35s ease'; };
    img.complete ? show() : img.addEventListener('load', show, {once:true});
  });

  // ===== Intro-Animationen via IntersectionObserver
  const once = {root:null, threshold: .25};

  // 1) Header: Title (Chars) + Subtitle (Words)
  const headerIO = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      headerIO.disconnect();

      // Split
      splitToChars(headTitle);
      const tChars = qa('.ds-char', headTitle);

      if(headSub) splitToWords(headSub);
      const sWords = headSub ? qa('.ds-word', headSub) : [];

      // Reveal
      revealChars(tChars, {duration:560, stagger:10, blur:6, y:120, delay:0});
      revealWords(sWords, {duration:440, stagger:18, blur:5, y:36, delay:120});
    });
  }, once);
  headerIO.observe(sec.querySelector('.compare-head'));

  // 2) Compare-Stage Intro-Sweep + Divider-Glow
  const stageIO = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      stageIO.disconnect();
      if(REDUCE) return;

      // Sweep: 0% -> 64% -> 50% (eleganter Einflug + settle)
      const a = 0, b = 64, settle = 50;
      const t0 = performance.now();
      const dur1 = 680, dur2 = 520;

      // startpose
      setSplit(a);
      handle.style.transition = divider.style.transition = 'none';

      const run1 = (now)=>{
        const p = Math.min(1, (now - t0)/dur1);
        setSplit( Math.round(a + (b-a)*easeCubic(p)) );
        if(p<1){ requestAnimationFrame(run1); }
        else {
          const t1 = performance.now();
          const run2 = (n2)=>{
            const q = Math.min(1, (n2 - t1)/dur2);
            setSplit( Math.round(b + (settle-b)*easeCubic(q)) );
            if(q<1) requestAnimationFrame(run2);
          };
          requestAnimationFrame(run2);
        }
      };
      requestAnimationFrame(run1);

      // Divider Glow Pulse (dezent)
      divider.animate([
        { boxShadow: '0 0 0px rgba(0,0,0,0)' },
        { boxShadow: '0 0 16px rgba(0,0,0,.20)' },
        { boxShadow: '0 0 0px rgba(0,0,0,0)' }
      ], { duration: 900, easing: 'ease-out' });

      // Handle micro-bounce
      handle.animate([
        { transform: 'translate(-50%, -50%) scale(1)'   },
        { transform: 'translate(-50%, -50%) scale(1.06)'},
        { transform: 'translate(-50%, -50%) scale(1)'   }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', delay: 380 });
    });
  }, once);
  stageIO.observe(stage);

  // 3) Touch-Hint (einmalig, wenn Nutzer noch nicht geswiped hat)
  const isTouch = matchMedia('(hover:none)').matches;
  const KEY = 'vnSwipeHintShown';
  if(isTouch && !sessionStorage.getItem(KEY) && !REDUCE){
    const hintIO = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        hintIO.disconnect();
        sessionStorage.setItem(KEY, '1');
        // kurzer Handle-Nudge
        handle.animate([
          { transform: 'translate(-50%, -50%) scale(1)', offset: 0   },
          { transform: 'translate(-50%, -50%) scale(1)', offset: .15},
          { transform: 'translate(-50%, -50%) scale(1.08)', offset: .35 },
          { transform: 'translate(-50%, -50%) scale(1)', offset: 1 }
        ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }, {threshold:.5});
    hintIO.observe(stage);
  }

  // ===== Section Parallax (dezent, performant)
  if(!REDUCE){
    let raf = null;
    const world = sec.querySelector('.compare-wrap');
    const onScroll = ()=>{
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = null;
        const r = sec.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // progress -1..1 um das Viewport-Zentrum
        const prog = ((r.top + r.height/2) - vh/2) / (vh/2);
        const y = clamp(-prog*8, -12, 12); // max ±12px
        world.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    };
    world.style.willChange = 'transform';
    addEventListener('scroll', onScroll, {passive:true});
    addEventListener('resize', onScroll, {passive:true});
    onScroll();
  }
})();


(function(){
  const sec    = document.getElementById('vorher-nachher');
  if (!sec) return;

  const stage  = sec.querySelector('.compare-stage');
  const before = stage.querySelector('.img-before');
  const after  = stage.querySelector('.img-after');
  const divider= stage.querySelector('.divider');
  const handle = stage.querySelector('.handle');

  // ——— Bild-Drag & Textauswahl hart deaktivieren (auch Safari) ———
  [before, after].forEach(img=>{
    img.draggable = false;
    img.style.userSelect = 'none';
    img.addEventListener('dragstart', e => e.preventDefault());
    const show=()=>{ img.style.opacity='1'; };
    img.complete ? show() : img.addEventListener('load', show, { once:true });
  });
  // Stage & Handle: keine Textauswahl / Gesten
  [stage, handle, divider].forEach(el=>{
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    el.style.touchAction = 'none'; // verhindert Browser-Gesten
  });

  // ——— Geometrie + Werte ———
  const clamp = (v,a=0,b=100)=> Math.max(a, Math.min(b, v));
  let rect = stage.getBoundingClientRect();
  const measure = ()=> (rect = stage.getBoundingClientRect());
  const toPct = x => ((x - rect.left) / rect.width) * 100;

  let current = 50;
  let target  = 50;
  let rafId   = null;
  let dragging= false;

  function apply(p){
    p = clamp(p);
    before.style.setProperty('--split', p + '%');
    divider.style.left = `calc(${p}% )`;
    handle.style.left  = p + '%';
    // zusätzlich transform (smoother in manchen Browsern)
    const tx = `translateX(${p - 50}%)`;
    divider.style.transform = tx;
    handle.style.transform  = `translate(-50%, -50%) ${tx}`;
    handle.setAttribute('aria-valuenow', String(Math.round(p)));
    stage.dataset.split = String(Math.round(p));
  }

  function tick(){
    rafId = null;
    const SMOOTH = 0.22;
    current += (target - current) * SMOOTH;
    if (Math.abs(target - current) < 0.05) current = target;
    apply(current);
    if (current !== target) rafId = requestAnimationFrame(tick);
  }
  const to = (p)=>{ target = clamp(p); if (!rafId) rafId = requestAnimationFrame(tick); };

  // Initial
  apply(50);

  // ——— Drag-Logik (Stage & Handle) ———
  function startDrag(e, useTarget){
    e.preventDefault();            // blockiert Bild-Drag / Textauswahl
    measure();
    dragging = true;
    useTarget.setPointerCapture(e.pointerId);
    to(toPct(e.clientX));
  }
  function moveDrag(e){
    if (!dragging) return;
    to(toPct(e.clientX));
  }
  function endDrag(e, useTarget){
    if (!dragging) return;
    dragging = false;
    try { useTarget.releasePointerCapture(e.pointerId); } catch(_) {}
  }

  // Drag auf der gesamten Stage
  stage.addEventListener('pointerdown', e => startDrag(e, stage));
  stage.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup',   e => endDrag(e, stage));
  window.addEventListener('pointercancel', ()=> (dragging=false));

  // Explizit auch der Mittel-Punkt (Handle) selbst draggable
  handle.addEventListener('pointerdown', e => startDrag(e, handle));
  handle.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup',   e => endDrag(e, handle));
  window.addEventListener('pointercancel', ()=> (dragging=false));

  // ——— Tastatur (A11y) ———
  handle.addEventListener('keydown', e=>{
    const step = e.shiftKey ? 10 : 2;
    const curr = Number(stage.dataset.split) || current || 50;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); to(curr - step); }
    if (e.key === 'ArrowRight') { e.preventDefault(); to(curr + step); }
    if (e.key === 'Home')       { e.preventDefault(); to(0); }
    if (e.key === 'End')        { e.preventDefault(); to(100); }
  });

  // ——— Resize/Scroll: Bounds aktualisieren, Position halten ———
  let rsf = null;
  const onRS = ()=>{
    if (rsf) return;
    rsf = requestAnimationFrame(()=>{
      rsf = null;
      const pct = Number(stage.dataset.split) || target;
      measure();
      current = target = clamp(pct);
      apply(current);
    });
  };
  window.addEventListener('resize', onRS, { passive:true });
  window.addEventListener('scroll',  onRS, { passive:true });

  // ——— Einmalige Intro-Bewegung (sanft) ———
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!REDUCE) {
    const io = new IntersectionObserver(entries=>{
      for (const entry of entries){
        if (!entry.isIntersecting) continue;
        io.disconnect();
        measure();
        current = target = 0; apply(0);
        const a=0, b=65, c=50, ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
        const t0 = performance.now(), d1=650, d2=520;
        const f1 = now=>{
          const p = Math.min(1,(now - t0)/d1);
          to(a + (b-a)*ease(p));
          if (p<1) requestAnimationFrame(f1);
          else {
            const t1 = performance.now();
            const f2 = n=>{
              const q = Math.min(1,(n - t1)/d2);
              to(b + (c-b)*ease(q));
              if (q<1) requestAnimationFrame(f2);
            };
            requestAnimationFrame(f2);
          }
        };
        requestAnimationFrame(f1);
        break;
      }
    }, { threshold:.35 });
    io.observe(stage);
  }

  // ——— Perf-Flags ———
  divider.style.willChange = 'transform,left';
  handle.style.willChange  = 'transform,left';
  before.style.willChange  = 'clip-path,mask,transform';

  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden && rafId){ cancelAnimationFrame(rafId); rafId=null; }
  });
})();

