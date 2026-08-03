/* =========================================================
   Fusion³ – Kontakt-Wizard (6 Steps) + Forminit-Anbindung
   Diese Datei ist die EINZIGE Quelle für die Wizard-Logik.
   Im HTML darf KEIN zweites <script> mit demselben Code stehen.
   ========================================================= */

/* ---------------------------------------------------------
   1) Wort-für-Wort-Einblendung der Überschriften (Step 1)
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.querySelector('.form-step[data-step="1"]');
  if (!step1) return;

  const elements = [
    document.querySelector('#kontakt .section-title'),
    document.querySelector('#kontakt .kontakt-subline'),
    ...step1.querySelectorAll('.choice .title'),
    ...step1.querySelectorAll('.choice small')
  ].filter(Boolean);

  function splitToWords(el) {
    const words = el.textContent.trim().split(/(\s+)/);
    el.textContent = "";

    return words.map(token => {
      if (token.trim() === "") {
        el.appendChild(document.createTextNode(token));
        return null;
      }
      const span = document.createElement("span");
      span.textContent = token;
      span.style.display = "inline-block";
      span.style.opacity = "0";
      span.style.filter = "blur(6px)";
      span.style.transform = "translateY(20px)";
      el.appendChild(span);
      return span;
    }).filter(Boolean);
  }

  let allWordSpans = [];
  elements.forEach(el => {
    allWordSpans = allWordSpans.concat(splitToWords(el));
  });

  allWordSpans.forEach((span, i) => {
    setTimeout(() => {
      span.style.transition = "opacity .45s ease-out, filter .45s ease-out, transform .45s ease-out";
      span.style.opacity = "1";
      span.style.filter = "blur(0px)";
      span.style.transform = "translateY(0)";
    }, i * 80);
  });
});


/* ---------------------------------------------------------
   2) Wizard-Logik
   --------------------------------------------------------- */
(function () {

  // Erst starten, wenn das DOM steht – egal wo die Datei eingebunden ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWizard, { once: true });
  } else {
    initWizard();
  }

  function initWizard() {

  const form = document.getElementById('kontaktForm');
  if (!form) return;

  // Schutz vor doppelter Initialisierung
  if (form.dataset.wizardReady === '1') return;
  form.dataset.wizardReady = '1';

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

  const successFieldset = allSteps.find(s => s.dataset.step === '6');
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

  /* Hinweis: Betreff, Zusammenfassung und Herkunftsseite werden
     nicht mehr über Hidden-Felder transportiert, sondern direkt
     im JSON-Payload aufgebaut (siehe buildForminitPayload).
     Die Hidden-Felder im HTML dürfen ruhig stehen bleiben. */

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
    return !!(stepEl.querySelector('input[name="name"]')
           || stepEl.querySelector('input[name="email"]')
           || stepEl.querySelector('textarea[name="message"]'));
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

      // Restart-Button immer frisch und klickbar
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

    updatePillUI();
    setProgress(targetIdx);

    const first = targetEl.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
    first?.focus({preventScroll:true});
  }

  /* =========================
     Restart / Success
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
    if (submitBtn) submitBtn.innerText = 'Senden!';
    if (scrollToStart) {
      step1.scrollIntoView({ behavior:'smooth', block:'start' });
      step1.querySelector('input,select,textarea,button')?.focus({ preventScroll:true });
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
     Validierung
  ========================== */
  function markInvalid(el, msg){
    if (!el) return;
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
      q('.is-invalid')?.focus({preventScroll:true});
      setStatus('Bitte fehlende Angaben ergänzen.', 'warn');
    } else setStatus('', '');
    return ok;
  }

  /* =========================
     Submit
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

  /* -------------------------------------------------------
     Baut den Forminit-Payload im "blocks"-Format.
     Doku: https://forminit.com/docs/submit-form-api/
     Wichtig: Forminit ignoriert freie Feldnamen. Es zaehlen
     nur typisierte Bloecke mit eindeutigem "name".
     ------------------------------------------------------- */
  function buildForminitPayload(){
    const blocks = [];

    // --- 1) Absenderdaten (Objekt-Block, nur einmal erlaubt) ---
    const sender = {
      email:    trim(q('input[name="email"]')?.value),
      fullName: trim(q('input[name="name"]')?.value)
    };
    // Telefon NICHT in sender: dort wird striktes E.164 erzwungen
    // (+491511234 5678 mit Leerzeichen wuerde abgelehnt).
    blocks.push({ type: 'sender', properties: sender });

    // --- 2) Freitextfelder ---
    const addText = (name, value) => {
      const v = trim(value);
      if (v) blocks.push({ type: 'text', name, value: v });
    };

    addText('nachricht', q('textarea[name="message"]')?.value);
    addText('telefon',   q('input[name="phone"]')?.value);
    addText('deadline',  q('input[name="deadline"]')?.value);
    addText('budget',    q('input[name="budget"]')?.value);

    // --- 3) Gewaehlte Leistung ---
    const svcEl = q('input[name="service"]:checked');
    const selectedService = svcEl ? svcEl.value : '';
    if (selectedService) {
      blocks.push({ type: 'radio', name: 'leistung', value: selectedService });
    }

    // --- 4) Alle aktiven Dropdowns ---
    qa('select', form).forEach(sel => {
      if (sel.disabled || !sel.value) return;
      blocks.push({ type: 'select', name: sel.name, value: sel.value });
    });

    // --- 5) Checkbox-Gruppen (Mehrfachauswahl) ---
    const groups = {};
    qa('input[type="checkbox"]', form).forEach(cb => {
      if (cb.disabled || !cb.checked) return;
      (groups[cb.name] = groups[cb.name] || []).push(cb.value);
    });
    Object.entries(groups).forEach(([name, values]) => {
      blocks.push({ type: 'checkbox', name, value: values });
    });

    // --- 6) Zusammenfassung als Klartext fuer die Mail ---
    const lines = [];
    lines.push(`Leistung: ${selectedService || '-'}`);
    lines.push(`Name:     ${sender.fullName || '-'}`);
    lines.push(`E-Mail:   ${sender.email || '-'}`);
    const tel = trim(q('input[name="phone"]')?.value);
    if (tel) lines.push(`Telefon:  ${tel}`);
    Object.entries(groups).forEach(([name, values]) => {
      lines.push(`${name}: ${values.join(', ')}`);
    });
    addText('betreff', `Projektanfrage: ${selectedService}`);
    addText('zusammenfassung', lines.join('\n'));
    addText('herkunft_seite', location.href);

    return { blocks };
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if (submitting) return;
    if (!validateRequired()) return;

    const payload = buildForminitPayload();

    submitting = true;
    toggleFormDisabled(true);
    submitBtn.innerText = 'Senden …';
    setStatus('Sende Anfrage …');

    try {
      const res = await postWithTimeout(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }, 12000);

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        console.error('Forminit-Antwort', res.status, data);
        // Verstaendliche Meldung fuer den haeufigsten Fall
        if (res.status === 429) {
          setStatus('Zu schnell hintereinander gesendet – bitte 5 Sekunden warten.', 'warn');
          submitBtn.innerText = 'Nochmal senden';
          toggleFormDisabled(false);
          submitting = false;
          return;
        }
        throw new Error(`${res.status} ${data?.error || ''} ${data?.message || ''}`.trim());
      }

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

  form.addEventListener('click', (e)=>{
    const choice = e.target.closest('.choice');
    if(choice && choice.querySelector('input[type="radio"]')){
      setTimeout(()=>{
        form.classList.remove('is-success');
        updateChoiceUI();
        syncServiceBlocks();
        showStepByIndex(getCurrentIndex());
      },0);
    }
    if (e.target.closest('.pill')) setTimeout(updatePillUI, 0);
  });

  form.addEventListener('change', (e)=>{
    if(e.target?.matches('input[name="service"]')){
      form.classList.remove('is-success');
      updateChoiceUI();
      syncServiceBlocks();
      showStepByIndex(getCurrentIndex());
      return;
    }
    if (e.target?.matches('.pill input[type="checkbox"]')) updatePillUI();
  });

  /* =========================
     Init
  ========================== */
  form.classList.remove('is-success');
  syncServiceBlocks();
  updateChoiceUI();
  updatePillUI();
  showStepByIndex(0);
  setStatus('');

  } // Ende initWizard
})();


/* ---------------------------------------------------------
   3) OPTIONAL: Nur Webdesign anbieten
   Dieser Block entfernt 3D-Design und Grafikdesign aus Step 1.
   Aktuell DEAKTIVIERT: der Code unten steht in einem
   Blockkommentar. Zum Aktivieren die Kommentarzeichen
   in den beiden Zeilen darunter entfernen.
   --------------------------------------------------------- */
/*
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('kontaktForm');
  if (!form) return;

  const webRadio = form.querySelector('input[name="service"][value="Webdesign"]');
  if (webRadio) webRadio.checked = true;

  form.querySelectorAll('.grid-choices .choice').forEach(ch => {
    const rb = ch.querySelector('input[type="radio"][name="service"]');
    if (rb && rb.value !== 'Webdesign') ch.remove();
  });

  webRadio?.dispatchEvent(new Event('change', { bubbles: true }));
});
*/