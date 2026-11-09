(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const screenUpload = $('screen-upload');
  const screenMode   = $('screen-mode');
  const screenStudy  = $('screen-study');
  const screenRepaso = $('screen-repaso');
  const screenDone   = $('screen-done');

  const dropzone   = $('dropzone');
  const fileInput  = $('fileInput');
  const fileInfo   = $('fileInfo');
  const startBtn   = $('startBtn');
  const dedupeChk  = $('dedupe');

  const modeCount      = $('modeCount');
  const modeRepasoBtn  = $('modeRepaso');
  const modeFlashBtn   = $('modeFlashcards');
  const backToUploadBtn = $('backToUploadBtn');

  const repasoCounter  = $('repasoCounter');
  const repasoProgress = $('repasoProgress');
  const repasoQuestion = $('repasoQuestion');
  const repasoAnswer   = $('repasoAnswer');
  const repasoPrevBtn  = $('repasoPrevBtn');
  const repasoNextBtn  = $('repasoNextBtn');

  const cardEl      = $('card');
  const cardScene   = $('cardScene');
  const questionEl  = $('questionText');
  const answerEl    = $('answerText');
  const badgeEl     = $('cardBadge');

  const revealActions = $('revealActions');
  const judgeActions  = $('judgeActions');
  const revealBtn     = $('revealBtn');
  const wrongBtn      = $('wrongBtn');
  const rightBtn      = $('rightBtn');

  const statDone     = $('statDone');
  const statOk       = $('statOk');
  const statBad      = $('statBad');
  const progressFill = $('progressFill');

  const doneSubtitle = $('doneSubtitle');
  const doneStats    = $('doneStats');
  const restartBtn   = $('restartBtn');
  const newFileBtn   = $('newFileBtn');

  const S = {
    parsed: [],
    mode: null,
    startTime: 0,
    cards: [],
    queue: [],
    current: null,
    revealed: false,
    locked: false,
    ok: 0,
    bad: 0,
    completed: 0,
    repasoCards: [],
    repasoIndex: 0
  };

  const REQUIRED_CORRECT = 3;

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const showScreen = (name) => {
    screenUpload.hidden = name !== 'upload';
    screenMode.hidden   = name !== 'mode';
    screenStudy.hidden  = name !== 'study';
    screenRepaso.hidden = name !== 'repaso';
    screenDone.hidden   = name !== 'done';
  };

  const formatTime = (ms) => {
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

  function renderAnswerHtml(card) {
    let html = '';
    if (card.theory) {
      html +=
        '<div class="answer-section">' +
          '<div class="answer-label">Respuesta teórica</div>' +
          '<div class="answer-text">' + escapeHtml(card.theory) + '</div>' +
        '</div>';
    }
    if (card.explanation) {
      html +=
        '<div class="answer-section">' +
          '<div class="answer-label">Explicación / aplicación en el proyecto</div>' +
          '<div class="answer-text">' + escapeHtml(card.explanation) + '</div>' +
        '</div>';
    }
    // NUEVO: la Referencia se muestra justo después de la explicación
    if (card.reference) {
      html +=
        '<div class="answer-section answer-section-reference">' +
          '<div class="answer-label">Referencia</div>' +
          '<div class="answer-text">' + escapeHtml(card.reference) + '</div>' +
        '</div>';
    }
    return html;
  }

  function parseCards(raw) {
    const text = String(raw).replace(/\r\n?/g, '\n');
    const blocks = text.split(/^[ \t]*-{3,}[ \t]*$/gm);
    const cards = [];

    const markerRe =
      /^[ \t]*(pregunta|respuesta\s+falsa(?:\s+\d+)?|respuesta(?:\s+te[oó]rica)?|explicaci[oó]n(?:\s+[^:\n]+)?|referencia)[ \t]*:[ \t]*/gim;

    for (const block of blocks) {
      const matches = [];
      let m;
      markerRe.lastIndex = 0;
      while ((m = markerRe.exec(block)) !== null) {
        const label = m[1].toLowerCase();
        const key = label.startsWith('pregunta')
          ? 'question'
          : label.startsWith('referencia')
            ? 'reference'
            : label.startsWith('explicaci')
              ? 'explanation'
              : (label.startsWith('respuesta') && label.includes('falsa'))
                ? 'false'
                : 'theory';
        matches.push({ key, start: m.index, contentStart: markerRe.lastIndex });
      }
      if (matches.length === 0) continue;

      const fields = { question: '', theory: '', explanation: '', reference: '' };
      for (let i = 0; i < matches.length; i++) {
        const end = i + 1 < matches.length ? matches[i + 1].start : block.length;
        const content = block.slice(matches[i].contentStart, end).trim();
        if (matches[i].key === 'false') continue;
        if (!fields[matches[i].key]) fields[matches[i].key] = content;
      }

      if (fields.question && (fields.theory || fields.explanation)) {
        cards.push({
          question: fields.question,
          theory: fields.theory,
          explanation: fields.explanation,
          reference: fields.reference
        });
      }
    }
    return cards;
  }

  async function loadFile(file) {
    if (!file) return;

    if (!/\.txt$/i.test(file.name) && file.type && !file.type.startsWith('text/')) {
      fileInfo.hidden = false;
      fileInfo.className = 'file-info err';
      fileInfo.textContent = 'El archivo debe ser un .txt de texto plano.';
      startBtn.disabled = true;
      S.parsed = [];
      return;
    }

    let content = '';
    try {
      content = await file.text();
    } catch (e) {
      fileInfo.hidden = false;
      fileInfo.className = 'file-info err';
      fileInfo.textContent = 'No se pudo leer el archivo.';
      startBtn.disabled = true;
      return;
    }

    const cards = parseCards(content);
    S.parsed = cards;

    fileInfo.hidden = false;

    if (cards.length === 0) {
      fileInfo.className = 'file-info err';
      fileInfo.innerHTML =
        '<div><div class="fi-name">' + escapeHtml(file.name) + '</div>' +
        '<div class="fi-meta">No se encontró ninguna pareja válida <b>pregunta:</b> / <b>respuesta:</b></div></div>';
      startBtn.disabled = true;
      return;
    }

    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    fileInfo.className = 'file-info';
    fileInfo.innerHTML =
      '<div><div class="fi-name">' + escapeHtml(file.name) + '</div>' +
      '<div class="fi-meta">' + sizeKb + ' KB</div></div>' +
      '<div class="fi-count">' + cards.length + ' tarjeta' + (cards.length === 1 ? '' : 's') + '</div>';

    startBtn.disabled = false;
  }

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    loadFile(file);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('drag');
    })
  );

  ['dragleave', 'drop'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('drag');
    })
  );

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  ['dragover', 'drop'].forEach((ev) =>
    window.addEventListener(ev, (e) => e.preventDefault())
  );

  function buildCards() {
    let cards = S.parsed.map((c) => ({
      question: c.question,
      theory: c.theory,
      explanation: c.explanation,
      reference: c.reference
    }));

    if (dedupeChk.checked) {
      const seen = new Set();
      cards = cards.filter((c) => {
        const key = c.question.trim().toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return cards;
  }

  startBtn.addEventListener('click', () => {
    const cards = buildCards();
    if (!cards.length) return;
    modeCount.textContent = cards.length;
    showScreen('mode');
  });

  backToUploadBtn.addEventListener('click', () => showScreen('upload'));

  modeRepasoBtn.addEventListener('click', () => startSession('repaso'));
  modeFlashBtn.addEventListener('click',  () => startSession('flashcards'));

  function startSession(mode) {
    const base = buildCards();
    if (!base.length) return;

    S.mode = mode;
    S.startTime = Date.now();

    if (mode === 'repaso') {
      S.repasoCards = shuffle(base.map((c) => ({
        question: c.question,
        theory: c.theory,
        explanation: c.explanation,
        reference: c.reference
      })));
      S.repasoIndex = 0;
      showScreen('repaso');
      renderRepaso();
    } else {
      S.cards = base.map((c) => ({
        question: c.question,
        theory: c.theory,
        explanation: c.explanation,
        reference: c.reference,
        streak: 0,
        failed: false,
        done: false
      }));
      S.queue = shuffle(S.cards.map((_, i) => i));
      S.current = null;
      S.revealed = false;
      S.locked = false;
      S.ok = 0;
      S.bad = 0;
      S.completed = 0;
      showScreen('study');
      updateHud();
      nextCard();
    }
  }

  function renderRepaso() {
    const card = S.repasoCards[S.repasoIndex];
    repasoQuestion.textContent = card.question;
    repasoAnswer.innerHTML = renderAnswerHtml(card);
    repasoQuestion.scrollTop = 0;
    repasoAnswer.scrollTop = 0;

    const total = S.repasoCards.length;
    repasoCounter.textContent = (S.repasoIndex + 1) + ' / ' + total;
    repasoProgress.style.width = (((S.repasoIndex + 1) / total) * 100) + '%';

    repasoPrevBtn.disabled = S.repasoIndex === 0;
    repasoNextBtn.textContent =
      S.repasoIndex === total - 1 ? 'Finalizar ✓' : 'Siguiente →';
  }

  repasoNextBtn.addEventListener('click', () => {
    if (S.repasoIndex < S.repasoCards.length - 1) {
      S.repasoIndex++;
      renderRepaso();
    } else {
      finishSession();
    }
  });

  repasoPrevBtn.addEventListener('click', () => {
    if (S.repasoIndex > 0) {
      S.repasoIndex--;
      renderRepaso();
    }
  });

  function requeue(idx) {
    const q = S.queue;
    if (q.length === 0) { q.push(idx); return; }
    const pos = 1 + Math.floor(Math.random() * q.length);
    q.splice(pos, 0, idx);
  }

  function nextCard() {
    if (S.queue.length === 0) { finishSession(); return; }
    S.current = S.queue.shift();
    S.revealed = false;
    S.locked = false;
    renderCard();
  }

  function resetFlip() {
    cardEl.style.transition = 'none';
    cardEl.classList.remove('flipped');
    void cardEl.offsetWidth;
    cardEl.style.transition = '';
  }

  function renderCard() {
    const card = S.cards[S.current];
    resetFlip();
    questionEl.textContent = card.question;
    answerEl.innerHTML = renderAnswerHtml(card);
    questionEl.scrollTop = 0;
    answerEl.scrollTop = 0;

    if (card.failed) {
      badgeEl.className = 'card-badge';
      badgeEl.textContent = 'Repaso · ' + card.streak + '/' + REQUIRED_CORRECT + ' aciertos seguidos';
    } else {
      badgeEl.className = 'card-badge is-new';
      badgeEl.textContent = 'Tarjeta nueva';
    }

    revealActions.hidden = false;
    judgeActions.hidden = true;
    revealBtn.disabled = false;

    updateHud();
  }

  function updateHud() {
    statDone.textContent = S.completed + '/' + S.cards.length;
    statOk.textContent = S.ok;
    statBad.textContent = S.bad;
    const pct = S.cards.length ? (S.completed / S.cards.length) * 100 : 0;
    progressFill.style.width = pct + '%';
  }

  function reveal() {
    if (S.revealed || S.current === null || S.locked) return;
    S.revealed = true;
    cardEl.classList.add('flipped');
    revealActions.hidden = true;
    judgeActions.hidden = false;
    answerEl.scrollTop = 0;
  }

  revealBtn.addEventListener('click', reveal);
  cardScene.addEventListener('click', () => { if (!S.revealed) reveal(); });

  function flash(kind) {
    cardScene.classList.remove('flash-ok', 'flash-bad');
    void cardScene.offsetWidth;
    cardScene.classList.add(kind === 'ok' ? 'flash-ok' : 'flash-bad');
  }
  cardScene.addEventListener('animationend', () => {
    cardScene.classList.remove('flash-ok', 'flash-bad');
  });

  function answer(isCorrect) {
    if (!S.revealed || S.locked || S.current === null) return;
    S.locked = true;
    const card = S.cards[S.current];
    const need = card.failed ? REQUIRED_CORRECT : 1;

    if (isCorrect) {
      S.ok++;
      card.streak++;
      if (card.streak >= need) {
        card.done = true;
        S.completed++;
      } else {
        requeue(S.current);
      }
      flash('ok');
    } else {
      S.bad++;
      card.failed = true;
      card.streak = 0;
      requeue(S.current);
      flash('bad');
    }

    updateHud();
    setTimeout(() => { S.locked = false; nextCard(); }, 400);
  }

  rightBtn.addEventListener('click', () => answer(true));
  wrongBtn.addEventListener('click', () => answer(false));

  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (!screenStudy.hidden) {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!S.revealed) reveal();
        return;
      }
      if (S.revealed) {
        if (e.key === 'ArrowLeft' || e.key === '1') {
          e.preventDefault(); answer(false);
        } else if (e.key === 'ArrowRight' || e.key === '2') {
          e.preventDefault(); answer(true);
        }
      }
    } else if (!screenRepaso.hidden) {
      if (e.key === 'ArrowRight') {
        e.preventDefault(); repasoNextBtn.click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); repasoPrevBtn.click();
      }
    }
  });

  function finishSession() {
    const elapsed = Date.now() - S.startTime;

    if (S.mode === 'repaso') {
      doneSubtitle.textContent = 'Has repasado todas las tarjetas.';
      doneStats.innerHTML =
        '<div class="done-stat"><span>Tarjetas repasadas</span><strong>' + S.repasoCards.length + '</strong></div>' +
        '<div class="done-stat"><span>Tiempo</span><strong>' + formatTime(elapsed) + '</strong></div>';
    } else {
      doneSubtitle.textContent = 'Has dominado todas las tarjetas.';
      doneStats.innerHTML =
        '<div class="done-stat"><span>Tarjetas</span><strong>' + S.cards.length + '</strong></div>' +
        '<div class="done-stat"><span>Tiempo</span><strong>' + formatTime(elapsed) + '</strong></div>' +
        '<div class="done-stat"><span>Aciertos</span><strong style="color:var(--spring-2)">' + S.ok + '</strong></div>' +
        '<div class="done-stat"><span>Fallos</span><strong style="color:#FF8A8E">' + S.bad + '</strong></div>';
    }

    showScreen('done');
  }

  restartBtn.addEventListener('click', () => startSession(S.mode));

  newFileBtn.addEventListener('click', () => {
    showScreen('upload');
    fileInfo.hidden = true;
    startBtn.disabled = S.parsed.length === 0;
  });

  showScreen('upload');
})();