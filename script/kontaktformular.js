document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.querySelector('.form-step[data-step="1"]');
  if (!step1) return;

  // 1) Elemente, die animiert werden sollen
  const elements = [
    document.querySelector('#kontakt .section-title'),
    document.querySelector('#kontakt .kontakt-subline'),
    ...step1.querySelectorAll('.choice .title'),
    ...step1.querySelectorAll('.choice small')
  ].filter(Boolean);

  // 2) Wortweises Splitten (Leerzeichen bleiben erhalten!)
  function splitToWords(el) {
    const words = el.textContent.trim().split(/(\s+)/); // Splittet, behält aber Zwischenräume
    el.textContent = ""; // Reset Inhalt

    return words.map(token => {
      if (token.trim() === "") {
        // echtes Leerzeichen → normaler Textnode (nicht animiert)
        const space = document.createTextNode(token);
        el.appendChild(space);
        return null;
      } else {
        // sichtbares Wort → in <span> packen
        const span = document.createElement("span");
        span.textContent = token;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.filter = "blur(6px)";
        span.style.transform = "translateY(20px)";
        el.appendChild(span);
        return span;
      }
    }).filter(Boolean);
  }

  // 3) Alle Wörter sammeln
  let allWordSpans = [];
  elements.forEach(el => {
    const spans = splitToWords(el);
    allWordSpans = allWordSpans.concat(spans);
  });

  // 4) Animation starten – Wort für Wort
  allWordSpans.forEach((span, i) => {
    setTimeout(() => {
      span.style.transition = "opacity .45s ease-out, filter .45s ease-out, transform .45s ease-out";
      span.style.opacity = "1";
      span.style.filter = "blur(0px)";
      span.style.transform = "translateY(0)";
    }, i * 80); // Wort-Geschwindigkeit (80ms für smooth & modern)
  });
});









(function () {
  const form = document.getElementById('kontaktForm');
  if (!form) return;

  /* =========================
     Cache DOM
  ========================== */
  const allSteps  = Array.from(form.querySelectorAll('.form-step'));
  const stepper   = form.querySelector('.stepper');
  const stepLabel = document.getElementById('stepLabel');
  const stepFill  = document.getElementById('stepperFill');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  // Success-Card DOM
  const successFieldset = allSteps.find(s => s.dataset.step === '6');
  const successCard     = successFieldset?.querySelector('.success-card');
  const successBtn      = successFieldset?.querySelector('.success-btn');
  const successSub      = successFieldset?.querySelector('.success-sub');

  /* =========================
     Live Status (a11y)
  ========================== */
  let statusBox = form.querySelector('[data-status]');
  if (!statusBox) {
    statusBox = document.createElement('div');
    statusBox.setAttribute('data-status','');
    statusBox.setAttribute('role','status');
    statusBox.setAttribute('aria-live','polite');
    statusBox.style.cssText = 'margin:.5rem 0 .25rem;font-weight:700;text-align:center;';
    form.insertBefore(statusBox, form.firstChild);
  }
  const setStatus = (msg, tone='')=>{
    statusBox.textContent = msg || '';
    statusBox.style.color =
      tone==='error' ? '#b00020' :
      tone==='ok'    ? '#0a7f2e' :
      tone==='warn'  ? '#a15c00' : 'inherit';
  };

  /* =========================
     Hidden Fields / Honeypot
  ========================== */
  ensureHidden({ id:'autoSubject',     name:'_subject',         tag:'input'    });
  ensureHidden({ id:'summaryPlain',    name:'summary_plain',    tag:'textarea' });
  ensureHidden({ id:'selectedService', name:'selected_service', tag:'input'    });
  ensureHidden({ id:'honeypot',        name:'_gotcha',          tag:'input'    });
  ensureHidden({ id:'metaRef',         name:'_referrer',        tag:'input'    }).value = location.href;
  ensureHidden({ id:'metaUA',          name:'_userAgent',       tag:'input'    }).value = navigator.userAgent;
  ensureHidden({ id:'metaOrigin',      name:'_origin',          tag:'input'    }).value = location.origin;

  function ensureHidden({id,name,tag='input'}) {
    let el = form.querySelector('#'+id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id; el.name = name;
      if (tag==='input') el.type = 'hidden';
      el.className = 'sr-only'; el.setAttribute('aria-hidden','true');
      form.appendChild(el);
    } else if (el.name !== name) {
      el.name = name;
    }
    return el;
  }

  /* =========================
     Helpers
  ========================== */
  const q  = (sel,root=form)=>root.querySelector(sel);
  const qa = (sel,root=form)=>Array.from(root.querySelectorAll(sel));
  const trim = s => (s||'').toString().trim();

  function collectStepData(stepEl) {
    const data = {};
    stepEl.querySelectorAll('input, select, textarea').forEach(el=>{
      if (el.disabled || el.closest('[hidden]')) return;
      if (el.type === 'checkbox') {
        if (!data[el.name]) data[el.name] = [];
        if (el.checked) data[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else if (el.tagName === 'SELECT') {
        if (el.value) data[el.name] = el.value;
      } else {
        const v = trim(el.value);
        if (v) data[el.name] = v;
      }
    });
    return data;
  }
  function hasVisibleControls(stepEl){
    const controls = Array.from(stepEl.querySelectorAll('input,select,textarea'));
    return controls.some(el => !el.disabled && !el.closest('[hidden]'));
  }
  function getApplicableSteps(){
    const base = allSteps.filter(s => hasVisibleControls(s) && s.dataset.step !== '6');
    const success = allSteps.find(s => s.dataset.step === '6');
    return form.classList.contains('is-success') && success ? [...base, success] : base;
  }
  function getCurrentIndex(){ return Math.max(0, getApplicableSteps().indexOf(currentStepEl)); }
  function clampIndex(i){ const st = getApplicableSteps(); return Math.min(Math.max(i,0), st.length-1); }

  function isContactStep(stepEl){
    if (!stepEl) return false;
    if (stepEl.dataset.step === '5') return true;
    const hasName = stepEl.querySelector('input[name="name"]');
    const hasMail = stepEl.querySelector('input[name="email"]');
    const hasMsg  = stepEl.querySelector('textarea[name="message"]');
    return !!(hasName || hasMail || hasMsg);
  }

  /* =========================
     UI / Progress
  ========================== */
  function updateChoiceUI(){
    form.querySelectorAll('.grid-choices .choice').forEach(label=>{
      const rb = label.querySelector('input[type="radio"]');
      label.classList.toggle('selected', !!(rb && rb.checked));
    });
    const any = form.querySelector('input[name="service"]:checked');
    if(currentStepEl === allSteps[0]) nextBtn.disabled = !any;
    setProgress(getCurrentIndex());
  }

  function updatePillUI(){
    form.querySelectorAll('.pill').forEach(lbl=>{
      const cb = lbl.querySelector('input[type="checkbox"]');
      lbl.classList.toggle('selected', !!(cb && cb.checked));
    });
  }

  function syncServiceBlocks(){
    const sel = form.querySelector('input[name="service"]:checked');
    const key = sel ? sel.dataset.toggle : null;
    ['web','d3','gfx'].forEach(k=>{
      form.querySelectorAll(`.service-block[data-service="${k}"]`).forEach(block=>{
        const vis = key === k;
        block.hidden = !vis;
        block.querySelectorAll('input,select,textarea').forEach(el=>{
          el.disabled = !vis;
          if(!vis){
            if(el.type==='checkbox'||el.type==='radio') el.checked=false;
            else if(el.tagName==='SELECT') el.selectedIndex=0;
            else el.value='';
          }
        });
      });
    });
    // nach dem Umschalten neu bewerten (grün hinterlegen)
    updatePillUI();
  }

  function setProgress(idx){
    const steps = getApplicableSteps();
    let pct = 0;
    if(idx === 0){
      pct = form.querySelector('input[name="service"]:checked') ? 12 : 0;
    } else {
      pct = Math.min(100, Math.round((idx / (steps.length - 1)) * 100));
    }
    if (stepFill) stepFill.style.width = pct + '%';
    stepper?.setAttribute('aria-valuenow', String(idx + 1));
    if (stepLabel) stepLabel.textContent = `Schritt ${idx + 1}/${steps.length}`;
  }

  function enhanceSubmitBtn() {
    if (!submitBtn || submitBtn.dataset.enhanced === '1') return;
    submitBtn.dataset.enhanced = '1';
    if (!submitBtn.textContent.trim()) submitBtn.textContent = 'Jetzt Anfrage senden';
  }

  /* =========================
     Navigation
  ========================== */
  let currentStepEl = allSteps[0];

  function showStepByIndex(idx){
    const steps = getApplicableSteps();
    if(!steps.length) return;
    const targetIdx = clampIndex(idx);
    const targetEl  = steps[targetIdx];

    allSteps.forEach(s => s.classList.remove('active'));
    targetEl.classList.add('active');
    currentStepEl = targetEl;

    const isSuccess = targetEl.dataset.step === '6';

    if (isSuccess) {
      form.classList.add('is-success');

      prevBtn.hidden = true;
      nextBtn.hidden = true;
      submitBtn.hidden = true;

      const step1 = allSteps.find(s => s.dataset.step === '1');
      const h = step1 ? step1.scrollHeight : 320;
      targetEl.style.setProperty('--step6-minh', h + 'px');

      // 💡 Restart-Button immer neu, immer klickbar
      const oldBtn = successFieldset.querySelector('.success-btn');
      if (oldBtn) {
        const freshBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(freshBtn, oldBtn);
        freshBtn.disabled = false;
        freshBtn.textContent = 'Neu starten';
        freshBtn.setAttribute('aria-label','Wizard neu starten');
        freshBtn.style.color = '#fff';
        freshBtn.addEventListener('click', handleRestart);
      }

      if (successSub) {
        successSub.textContent = 'Du kannst jetzt neu starten und die Schritte erneut durchlaufen.';
        successSub.style.color = '#fff';
      }

    } else {
      form.classList.remove('is-success');
      prevBtn.hidden = false;
      const onContact = isContactStep(targetEl);
      nextBtn.hidden   = onContact;
      submitBtn.hidden = !onContact;
      if (onContact) enhanceSubmitBtn();
      prevBtn.disabled = targetIdx === 0;
      nextBtn.disabled = targetEl === allSteps[0] && !form.querySelector('input[name="service"]:checked');
    }

    // sicherstellen, dass Pills korrekt eingefärbt bleiben
    updatePillUI();

    setProgress(targetIdx);
    const first = targetEl.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    first?.focus({preventScroll:true});
  }

  /* =========================
     Restart / Success Handling
  ========================== */
  function resetToStep1(scrollToStart = true){
    form.reset();
    form.classList.remove('is-success');
    allSteps.forEach(s => s.classList.remove('active'));
    const step1 = allSteps.find(s => s.dataset.step === '1') || allSteps[0];
    step1.classList.add('active');
    currentStepEl = step1;
    syncServiceBlocks();
    updateChoiceUI();
    updatePillUI();
    setProgress(0);
    toggleFormDisabled(false);
    setStatus('', '');
    if (scrollToStart) {
      step1.scrollIntoView({ behavior:'smooth', block:'start' });
      const first = step1.querySelector('input,select,textarea,button');
      first?.focus({ preventScroll:true });
    }
  }

  function handleRestart(e){
    if (e) { e.preventDefault(); e.stopPropagation(); }
    resetToStep1(true);
  }

  function showSuccessScreen(){
    const steps = getApplicableSteps();
    const successIdx = steps.findIndex(s => s.dataset.step === '6');
    if (successIdx >= 0) showStepByIndex(successIdx);
  }

  /* =========================
     Validierung / Markierung
  ========================== */
  function markInvalid(el, msg){
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid','true');
    if (!el.nextElementSibling || !el.nextElementSibling.matches('.field-error')) {
      const e = document.createElement('div');
      e.className = 'field-error';
      e.style.cssText = 'color:#b00020;font-weight:700;margin-top:.2rem;font-size:.9rem;';
      e.textContent = msg;
      el.insertAdjacentElement('afterend', e);
    } else el.nextElementSibling.textContent = msg;
  }
  function clearInvalids(){
    qa('.is-invalid', form).forEach(el=>{
      el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid');
    });
    qa('.field-error', form).forEach(el=> el.remove());
  }
  function validEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function validateRequired(){
    clearInvalids();
    const name  = q('input[name="name"]');
    const email = q('input[name="email"]');
    const msg   = q('textarea[name="message"]');
    let ok = true;
    if (!trim(name?.value))               { markInvalid(name,'Bitte Namen angeben.'); ok=false; }
    if (!validEmail(trim(email?.value)))  { markInvalid(email,'Bitte gültige E-Mail angeben.'); ok=false; }
    if (trim(msg?.value).length < 5)      { markInvalid(msg,'Bitte kurz dein Projekt beschreiben.'); ok=false; }
    if (!ok) {
      const first = q('.is-invalid');
      first?.focus({preventScroll:true});
      setStatus('Bitte fehlende Angaben ergänzen.', 'warn');
    } else setStatus('', '');
    return ok;
  }

  /* =========================
     Submit Flow
  ========================== */
  let submitting = false;
  function toggleFormDisabled(disabled){
    qa('input,select,textarea,button', form).forEach(el=> el.disabled = disabled);
  }

  async function postWithTimeout(url, options={}, timeoutMs=12000) {
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(t); }
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if (submitting) return;

    if (!validateRequired()) return;

    const selectedServiceEl = q('input[name="service"]:checked');
    const selectedService   = selectedServiceEl ? selectedServiceEl.value : '';

    const summary = {};
    getApplicableSteps().forEach((step, i) => { summary[`step_${i+1}`] = collectStepData(step); });

    const lines = [];
    lines.push(`[Service] ${selectedService}`);
    lines.push(`[Kontakt]`);
    lines.push(`- Name: ${summary.step_5?.name || '-'}`);
    lines.push(`- E-Mail: ${summary.step_5?.email || '-'}`);
    if (summary.step_5?.message) lines.push(`- Nachricht: ${summary.step_5.message}`);
    const compiledPlain = lines.join('\n');

    q('#autoSubject').value     = `Projektanfrage: ${selectedService}`;
    q('#selectedService').value = selectedService;
    q('#summaryPlain').value    = compiledPlain;
    q('#honeypot').value        = '';

    const fd = new FormData(form);
    submitting = true;
    toggleFormDisabled(true);
    submitBtn.innerText = 'Senden …';
    setStatus('Sende Anfrage …');

    try {
      const res = await postWithTimeout(form.action, {
        method:'POST',
        body:fd,
        headers:{Accept:'application/json'}
      }, 12000);
      if (!res.ok) throw new Error(res.statusText);
      submitBtn.innerText = '✅ Anfrage gesendet!';
      setStatus('Danke! Wir melden uns in Kürze.', 'ok');
      form.classList.add('is-success');
      showSuccessScreen();
    } catch (err) {
      console.error(err);
      setStatus('Fehler beim Senden – bitte später erneut versuchen.', 'error');
      submitBtn.innerText = 'Fehler!';
      toggleFormDisabled(false);
    } finally {
      submitting = false;
    }
  });

  /* =========================
     Buttons & Choices
  ========================== */
  prevBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    showStepByIndex(getCurrentIndex()-1);
  });
  nextBtn.addEventListener('click', ()=>{
    if (isContactStep(currentStepEl)) form.requestSubmit();
    else showStepByIndex(getCurrentIndex()+1);
  });

  // Klick auf Step-1-Karten (Service)
  form.addEventListener('click', (e)=>{
    const choice = e.target.closest('.choice');
    if(choice){
      const rb = choice.querySelector('input[type="radio"]');
      if(rb){
        setTimeout(()=>{
          form.classList.remove('is-success');
          updateChoiceUI();
          syncServiceBlocks();
          showStepByIndex(getCurrentIndex());
        },0);
      }
    }
    // Klick auf Pill-Labels (Schwerpunkte)
    const pill = e.target.closest('.pill');
    if (pill) {
      // Wait until checkbox toggled, then refresh UI
      setTimeout(updatePillUI, 0);
    }
  });

  // Änderungen an Service oder Pill-Checkboxen
  form.addEventListener('change', (e)=>{
    if(e.target && e.target.matches('input[name="service"]')){
      form.classList.remove('is-success');
      updateChoiceUI();
      syncServiceBlocks();
      showStepByIndex(getCurrentIndex());
      return;
    }
    if (e.target && (e.target.matches('.pill input[type="checkbox"]') || e.target.matches('input[data-pills]'))) {
      updatePillUI();
    }
  });

  /* =========================
     Init
  ========================== */
  function init(){
    form.classList.remove('is-success');
    syncServiceBlocks();
    updateChoiceUI();
    updatePillUI();
    showStepByIndex(0);
    setStatus('');
  }
  init();

})();

  // … dein bestehendes IIFE …

  // === Patch: Step 1 auf "Webdesign" beschränken + vorauswählen ===
  (function lockToWebdesign(){
    const form = document.getElementById('kontaktForm');
    if (!form) return;

    // 1) Vorauswählen
    const webRadio = form.querySelector('input[name="service"][value="Webdesign"]');
    if (webRadio) {
      webRadio.checked = true;
      webRadio.setAttribute('aria-checked','true');
    }

    // 2) Falls doch weitere Choices vorhanden wären -> entfernen
    const choices = Array.from(form.querySelectorAll('.grid-choices .choice'));
    choices.forEach(ch => {
      const rb = ch.querySelector('input[type="radio"][name="service"]');
      if (rb && rb.value !== 'Webdesign') ch.remove();
    });

    // 3) UI & Service-Blöcke syncen + Next aktivieren
    try {
      // diese Funktionen existieren in deinem Script:
      // updateChoiceUI(), syncServiceBlocks(), showStepByIndex()
      updateChoiceUI();
      syncServiceBlocks();
      // Step 2 wird aktiv, sobald der User "Weiter" drückt
      const nextBtn = form.querySelector('#nextBtn');
      if (nextBtn) nextBtn.disabled = false;
    } catch(e){}
  })();
