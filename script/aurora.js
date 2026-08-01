/* ============================================================
   AURORA REVEAL – Patch: Karten beim Hochscrollen
   ============================================================

   In aurora-reveal.js diesen Block in build() suchen:

       ST.batch(cards, {
         start: CFG.start,
         once: true,
         onEnter: batch => batch.forEach((card, i) => play(card, i * 0.08))
       });

       // Zeiger-Effekte erst nach dem Aufbau anhängen
       pointerFX(cards);
       if (CFG.distort) liquid();

   und komplett durch das Folgende ersetzen.
   Der Rest der Datei bleibt unverändert.
   ============================================================ */

      /* Jede Karte läuft genau einmal – egal, aus welcher
         Richtung sie ins Bild kommt. */
      const playOnce = (card, offset) => {
        if (card.dataset.arPlayed === "1") return;
        card.dataset.arPlayed = "1";
        play(card, offset);
      };

      ST.batch(cards, {
        start: CFG.start,
        once: false,                                   /* war: true */
        onEnter:     b => b.forEach((c, i) => playOnce(c, i * 0.08)),
        onEnterBack: b => b.forEach((c, i) => playOnce(c, i * 0.08))
      });

      /* Alles, was beim Start schon im Bild steht oder bereits
         darüber liegt, sofort abspielen. Sonst bleiben Karten
         unsichtbar, wenn jemand über einen Anker mitten in die
         Seite springt oder von ganz unten hochscrollt. */
      requestAnimationFrame(() => {
        const vh = window.innerHeight;
        cards.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          if (r.top < vh * 0.92) playOnce(c, Math.min(i, 3) * 0.06);
        });
      });

      /* Sicherheitsnetz: Was nach vier Sekunden immer noch nicht
         gelaufen ist, wird ohne Animation sichtbar gemacht.
         Besser ein fehlender Effekt als eine leere Karte. */
      setTimeout(() => {
        cards.forEach(c => {
          if (c.dataset.arPlayed === "1") return;
          c.dataset.arPlayed = "1";
          gsap.set(c, { opacity: 1, y: 0, clearProps: "willChange" });
          gsap.set(c.querySelectorAll(".sentence, .word, li"), { opacity: 1 });
          const m = $$(CFG.cardMedia, c);
          if (m.length) gsap.set(m, { clipPath: "none", opacity: 1 });
        });
      }, 4000);

      /* Zeiger-Effekte erst nach dem Aufbau anhängen */
      pointerFX(cards);
      if (CFG.distort) liquid();