/* WRF Offer — premium reveal (solid-white curtains)
   - Zwei absolut weiße Paneele (links/rechts), decken die Section zu 100% ab (je 50%)
   - Fahren smooth auseinander (links nach links, rechts nach rechts)
   - Eyebrow “48” zählt 0 → data-count, CTA-Note-Zahl ebenso
   - Untertitel Wort-für-Wort mit Blur
   - Subtiles Section-Parallax
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

  // Wort-Wrapping (bewahrt Inline-HTML)
  function wrapWordsRecursive(root){
    if (!root || root.dataset.words === "1") return root;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode:n => n.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes=[]; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(tok=>{
        if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
        else {
          const span=document.createElement("span");
          span.className="word"; span.style.display="inline-block"; span.style.whiteSpace="pre";
          span.textContent=tok; frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag,node);
    });
    root.dataset.words="1"; return root;
  }

  // Zahl in Container zu <span class="wrf-number">N</span> machen (erste gefundene)
  function ensureNumberSpan(container){
    if (!container) return null;
    const ex = container.querySelector(".wrf-number");
    if (ex) return ex;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let n, node=null, idx=-1, len=0;
    while ((n=walker.nextNode())) { const m=n.nodeValue.match(/(\d+)/); if (m){ node=n; idx=m.index; len=m[1].length; break; } }
    if (!node) return null;
    const before=node.nodeValue.slice(0,idx), num=node.nodeValue.slice(idx,idx+len), after=node.nodeValue.slice(idx+len);
    const frag=document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    const span=document.createElement("span"); span.className="wrf-number"; span.textContent=num; frag.appendChild(span);
    if (after) frag.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(frag,node);
    return span;
  }

  // CountUp 0 → target (easeOutCubic)
  function countUp(el, target, durSec=1.1){
    const to=Math.max(0,Number(target)||0);
    el.textContent="0";
    const t0=performance.now(), ease=t=>1-Math.pow(1-t,3);
    function tick(now){
      const p=Math.min(1,(now-t0)/(durSec*1000));
      el.textContent=String(Math.round(to*ease(p)));
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // SOLID-WHITE CURTAINS (je 50%, voll deckend)
  function buildCurtains(section){
    const L=document.createElement("div");
    const R=document.createElement("div");
    const base = {
      position:"absolute", top:"0", bottom:"0",
      width:"50%", height:"100%",
      background:"#ffffff",                 // <-- komplett weiß
      zIndex:"9999",                        // über allem in der Section
      transform:"translateX(0%)", opacity:"1",
      willChange:"transform, opacity",
      pointerEvents:"none"
    };
    Object.assign(L.style, base, { left:"0"  });
    Object.assign(R.style, base, { right:"0" });

    // Section vorbereiten
    const cs=getComputedStyle(section);
    if (cs.position==="static") section.style.position="relative";
    section.style.overflow="hidden"; // verhindert Überragen beim Slide

    section.appendChild(L); section.appendChild(R);
    return { L, R };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("wrf-offer");
    if (!root) return;

    if (!window.gsap) await loadScript(CDN);
    const { gsap } = window;

    const eyebrowPill = $(".wrf-eyebrow__pill", root);
    const eyebrowNum  = $(".wrf-count", root); // data-count="48"
    const subtitleEl  = $(".wrf-subtitle", root);
    const cta         = $(".wrf-btn--cta", root);
    const noteEl      = $("#wrf-cta-note", root); // „Antwort innerhalb von 48 h“
    const noteNum     = ensureNumberSpan(noteEl);

    wrapWordsRecursive(subtitleEl);
    const words = $$(".word", subtitleEl);

    const { L:curtainL, R:curtainR } = buildCurtains(root);

    // Initial
    gsap.set([curtainL, curtainR], { xPercent:0, opacity:1 });
    gsap.set(eyebrowPill, { y:-12, autoAlpha:0, filter:"blur(6px)", scale:0.985 });
    gsap.set(words,       { yPercent:42, autoAlpha:0, filter:"blur(6px)" });
    gsap.set(cta,         { y:18, autoAlpha:0, filter:"blur(5px)" });
    gsap.set(root,        { y:0 });

    let played=false;
    const io=new IntersectionObserver((entries)=>{
      const e=entries[0];
      if(!e.isIntersecting || played) return;
      played=true;

      const tl=gsap.timeline({ defaults:{ ease:"power3.out" } });

      // 1) Weiße Vorhänge fahren auseinander (voll deckend → reveal)
      tl.to(curtainL, { xPercent:-100, duration:0.78, ease:"expo.inOut" }, 0);
      tl.to(curtainR, { xPercent: 100, duration:0.78, ease:"expo.inOut" }, 0);
      tl.add(()=>{ curtainL.remove(); curtainR.remove(); }, "+=0.02");

      // 2) Eyebrow rein + CountUp 0→data-count
      tl.to(eyebrowPill, {
        y:0, autoAlpha:1, filter:"blur(0px)", scale:1, duration:0.48,
        onComplete(){ if (eyebrowNum) countUp(eyebrowNum, eyebrowNum.dataset.count || 48, 1.0); }
      }, 0.10);

      // 3) Untertitel Wort-für-Wort (Blur → clean) mit curved stagger
      const curve = gsap.utils.distribute({ base:0, amount:0.14, from:"start" });
      tl.to(words, {
        yPercent:0, autoAlpha:1, filter:"blur(0px)",
        duration:0.50, ease:"power2.out",
        stagger:(i,t)=>0.022 + curve(i,t,words.length)*0.5
      }, 0.20);

      // 4) CTA
      tl.to(cta, { y:0, autoAlpha:1, filter:"blur(0px)", duration:0.46 }, 0.38);

      // 5) CTA-Note: Zahl ebenfalls hochzählen (0→bestehender Wert, z.B. 48)
      tl.add(()=>{ if (noteNum) countUp(noteNum, noteNum.textContent || 48, 0.9); }, 0.48);

      // Parallax soft aktivieren
      bindParallax();
    }, { root:null, threshold:0.35, rootMargin:"0% 0px -8% 0px" });
    io.observe(root);

    // Micro-Interactions
    if (window.matchMedia("(hover:hover)").matches) {
      cta?.addEventListener("pointerenter", ()=> gsap.to(cta,{ y:-2, duration:0.18, ease:"power2.out" }));
      cta?.addEventListener("pointerleave", ()=> gsap.to(cta,{ y: 0, duration:0.20, ease:"power2.out" }));
    }
    cta?.addEventListener("mousedown", ()=> gsap.to(cta,{ scale:0.985, duration:0.08 }));
    cta?.addEventListener("mouseup",   ()=> gsap.to(cta,{ scale:1.000, duration:0.10 }));

    // Subtiles Parallax der gesamten Section
    let raf=null, yTo=null, active=false;
    function bindParallax(){
      yTo = gsap.quickTo(root, "y", { duration:0.6, ease:"power3.out" });
      active = true; onScroll();
      window.addEventListener("scroll", onScroll, { passive:true });
      window.addEventListener("resize", onScroll);
    }
    function onScroll(){
      if(!active || raf) return;
      raf = requestAnimationFrame(()=>{
        raf=null;
        const r=root.getBoundingClientRect(), vh=window.innerHeight||1;
        if (r.bottom<0 || r.top>vh){ yTo && yTo(0); return; }
        const prog=(vh*0.5 - (r.top + r.height*0.5)) / (vh + r.height); // ~ -0.5..0.5
        yTo && yTo(prog*28); // ±14px
      });
    }
  });
})();
