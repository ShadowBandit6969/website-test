/* Arbeitsproben — premium gallery motion
   - GSAP-powered, tasteful + performance-friendly
   - Title chars: soft flip/blur-in; subtitle words: blur cascade
   - Grid cells: masonry-aware stagger, lift + scale(1.06→1), image fade/ken-burns
   - Caption: tag slides in, title fades up
   - Hover (fine pointer): springy tilt with gsap.quickTo; reset on leave
   - Gentle section parallax while in view
   - Respects prefers-reduced-motion
*/
(function () {
  const CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  // --- tiny utils --------------------------------------------------------
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  function loadScript(src){
    return new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src; el.onload = res; el.onerror = () => rej(new Error("failed "+src));
      document.head.appendChild(el);
    });
  }
  // split-to-words (preserves inline markup)
  function wrapWords(root){
    if (!root || root.dataset.words === "1") return root;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.REJECT
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
    root.dataset.words="1";
    return root;
  }
  // split-to-chars with per-word wrapper
  function wrapChars(el){
    if (!el || el.dataset.chars === "1") return el;
    const words = wrapWords(el).querySelectorAll(".word");
    words.forEach(w=>{
      const chars=[...w.textContent]; w.textContent="";
      const wrap=document.createElement("span"); wrap.className="chars"; wrap.style.display="inline-block";
      chars.forEach(c=>{
        const s=document.createElement("span");
        s.className="char"; s.style.display="inline-block"; s.textContent=c;
        wrap.appendChild(s);
      });
      w.appendChild(wrap);
    });
    el.dataset.chars="1"; return el;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const section = document.getElementById("arbeitsproben");
    if (!section) return;

    if (!window.gsap) await loadScript(CDN);
    const { gsap } = window;

    // ---------- Header intro ----------
    const title    = $(".board-head .aurora-title", section);
    const subtitle = $(".board-head .aurora-subtitle .subtitle-full", section);

    if (title) {
      wrapChars(title);
      const chars = $$(".char", title);
      gsap.set(chars, { transformOrigin: "50% 70%", rotateX: 55, yPercent: 110, filter: "blur(6px)", autoAlpha: 0 });
      gsap.to(chars, {
        yPercent: 0, rotateX: 0, autoAlpha: 1, filter: "blur(0px)",
        duration: 0.56, ease: "power3.out", stagger: { each: 0.010, from: "center" }
      });
    }
    if (subtitle) {
      wrapWords(subtitle);
      const words = $$(".word", subtitle);
      gsap.set(words, { yPercent: 36, autoAlpha: 0, filter: "blur(5px)" });
      gsap.to(words, {
        yPercent: 0, autoAlpha: 1, filter: "blur(0px)",
        duration: 0.48, ease: "power2.out", stagger: { each: 0.022, from: "start" }, delay: 0.10
      });
    }

    // ---------- Grid cells reveal ----------
    const grid  = $(".board-grid", section);
    const cells = $$(".cell", grid);

    // Pre-states per cell content
    cells.forEach(cell => {
      const fig = $(".card", cell);
      const img = $("img", fig);
      const tag = $(".cap-tag", fig);
      const cap = $(".cap-title", fig);

      gsap.set(cell, { y: 26, autoAlpha: 0, filter: "blur(4px)" });
      img && gsap.set(img, { opacity: 0, scale: 1.06, rotate: 0.001 });
      tag && gsap.set(tag, { x: -8, autoAlpha: 0, filter: "blur(3px)" });
      cap && gsap.set(cap, { y: 6, autoAlpha: 0, filter: "blur(3px)" });
    });

    // Masonry-aware stagger: compute column + row index by DOM order + span
    function getStaggerIndex(el){
      const span = el.getAttribute("data-span") || "s";
      const weight = ({ xs:1, s:1, m:2, l:3, xl:4 })[span] || 1;
      // simple heuristic: earlier/lighter first
      return el.dataset.orderIdx * 10 - weight;
    }
    cells.forEach((c,i)=> c.dataset.orderIdx = i);

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (!e.isIntersecting) return;
        const cell = e.target; io.unobserve(cell);

        const fig = $(".card", cell);
        const img = $("img", fig);
        const tag = $(".cap-tag", fig);
        const cap = $(".cap-title", fig);

        const baseDelay = Math.max(0, getStaggerIndex(cell)) * 0.01;

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        // cell lift-in
        tl.to(cell, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.42 }, baseDelay);

        // image fade/ken-burns settle
        if (img) {
          tl.to(img, { opacity: 1, duration: 0.24, ease: "sine.out" }, baseDelay + 0.02)
            .to(img, { scale: 1.0, duration: 0.65, ease: "power2.out" }, "<");
        }

        // caption pieces
        if (tag) tl.to(tag, { x: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.32 }, baseDelay + 0.10);
        if (cap) tl.to(cap, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.36 }, baseDelay + 0.14);

        // micro “breathe” on figure
        tl.to(fig, { y: -2, duration: 0.12, ease: "sine.out" }, baseDelay + 0.30)
          .to(fig, { y:  0, duration: 0.18, ease: "sine.inOut" }, ">");
      });
    }, { root: null, threshold: 0.18, rootMargin: "0% 0px -10% 0px" });

    cells.forEach(c => io.observe(c));

    // ---------- Smooth image load (no hard pop) ----------
    $$(".card img", grid).forEach(img=>{
      const show = () => { img.style.opacity = "1"; };
      if (img.complete) show(); else img.addEventListener("load", show, { once:true });
    });

    // ---------- Hover tilt (fine pointer only) ----------
    if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
      $$(".card", grid).forEach(card=>{
        const toRX = gsap.quickTo(card, "rotateX", { duration: 0.28, ease: "power2.out" });
        const toRY = gsap.quickTo(card, "rotateY", { duration: 0.28, ease: "power2.out" });
        const toTY = gsap.quickTo(card, "y",       { duration: 0.28, ease: "power2.out" });
        const max = 5; // deg
        function move(e){
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left)/r.width  - 0.5;
          const py = (e.clientY - r.top )/r.height - 0.5;
          toRY(-px * max);
          toRX(py * max);
          toTY(-2);
        }
        function leave(){
          toRY(0); toRX(0); toTY(0);
        }
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
      });
    }

    // ---------- Gentle section parallax ----------
    let raf = null, yTo = gsap.quickTo(section, "y", { duration: 0.6, ease: "power3.out" });
    function onScroll(){
      if (raf) return;
      raf = requestAnimationFrame(()=>{
        raf = null;
        const r = section.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        if (r.bottom < 0 || r.top > vh) { yTo(0); return; }
        const prog = (vh * 0.5 - (r.top + r.height * 0.5)) / (vh + r.height); // ~ -0.5..0.5
        yTo(prog * 32); // ±16px
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    // ---------- Interaction hygiene ----------
    // Cards are visual only: neutralize click/keyboard if any
    grid.addEventListener("click", (e)=>{
      const card = e.target.closest(".card");
      if (card) { e.preventDefault(); e.stopPropagation(); }
    }, { capture: true });
    $$(".card", grid).forEach(card=>{
      card.addEventListener("keydown", (e)=>{
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); }
      });
    });
  });
})();



/* ===== Interaktionen: Reveal + sanfter Tilt + Img Fade-In ===== */
(function(){
  const section = document.getElementById('arbeitsproben');
  const grid = section.querySelector('.board-grid');
  const cells = Array.from(grid.querySelectorAll('.cell'));

  // Scroll-Reveal
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
  cells.forEach(c=> io.observe(c));

  // Karten sind rein visuell: Klicks blocken
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('.card');
    if(card){ e.preventDefault(); e.stopPropagation(); }
  }, {capture:true});

  // Tastatur: Enter/Space neutralisieren (falls Card doch fokusierbar wäre)
  grid.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); e.stopPropagation();
      }
    });
  });

  // Ruhiger Tilt (nur Präzisions-Pointer)
  const max = 4; // maximal ~4°
  const coarse = matchMedia('(pointer:coarse)');
  grid.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      if (coarse.matches) return;
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left)/r.width - .5) * -max;
      const y = ((e.clientY - r.top )/r.height - .5) *  max;
      card.style.transform = `rotateX(${y}deg) rotateY(${x}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', ()=> card.style.transform = '');
  });

  // Mini Fade-In Loader für Bilder (verhindert hartes Aufpoppen)
  grid.querySelectorAll('img').forEach(img=>{
    const markLoaded = () => img.setAttribute('data-loaded','true'), show = () => img.style.opacity = '1';
    if (img.complete) { markLoaded(); show(); }
    img.addEventListener('load', ()=> { markLoaded(); show(); }, { once:true });
  });
})();

