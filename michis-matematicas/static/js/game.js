/* ═══════════════════════════════════════════════
   game.js – Michis Matemáticas
   Lógica del juego, sonidos, estados
═══════════════════════════════════════════════ */

/* ── Cat Sprites ── */
const CATS = {
  idle:  "  /\\_/\\  \n ( o.o ) \n  > ^ <  \n /|   |\\ ",
  happy: "  /\\_/\\  \n ( ^.^ ) \n  > ♪ <  \n /|   |\\ ",
  sad:   "  /\\_/\\  \n ( T.T ) \n  > _ <  \n /|   |\\ ",
  think: "  /\\_/\\  \n ( o_O ) \n  > ? <  \n /|   |\\ ",
  win:   "  /\\_/\\  \n ( ★.★ ) \n  > ♫ <  \n /|   |\\ ",
  cheer: "  /\\_/\\  \n ( ≧▽≦) \n  > ♫ <  \n /|   |\\ ",
};

const CAT_PHRASES = {
  happy: ["¡Correcto! 🎉", "¡Eso es! 🌟", "¡Excelente! ✨", "¡Muy bien! 🎊", "¡Genial! 🏆"],
  sad:   ["¡Casi! 😿", "¡Tú puedes! 💪", "¡Sigue intentando! 🐾", "¡No te rindas! 🌈"],
  streak:["¡Racha! 🔥🔥", "¡Imparable! 🚀", "¡Eres increíble! ⭐", "¡Michi está orgulloso! 😻"],
  time:  ["¡Se acabó el tiempo! ⏰", "¡Más rápido! ⚡", "¡El tiempo vuela! 🕐"],
};

/* ── Sound Engine (Web Audio API) ── */
const SFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function beep(freq, type, duration, vol = 0.25) {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type      = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      o.start(c.currentTime);
      o.stop(c.currentTime + duration);
    } catch(e) { /* silent fail if AudioContext blocked */ }
  }
  return {
    correct() { beep(520, 'sine', 0.12); setTimeout(() => beep(660, 'sine', 0.15), 100); },
    wrong()   { beep(220, 'sawtooth', 0.3, 0.2); },
    streak()  { [440,550,660,880].forEach((f,i) => setTimeout(() => beep(f,'sine',0.1),i*80)); },
    tick()    { beep(880, 'square', 0.05, 0.05); },
    start()   { [330,440,550].forEach((f,i) => setTimeout(() => beep(f,'triangle',0.15),i*100)); },
    gameover(){ [440,330,220].forEach((f,i) => setTimeout(() => beep(f,'sawtooth',0.25),i*150)); },
    win()     { [440,550,660,770,880].forEach((f,i) => setTimeout(() => beep(f,'sine',0.2),i*100)); },
  };
})();

/* ── State ── */
let gameMode   = 'practice';
let gameOp     = 'suma';
let gameDif    = 'easy';
let score      = 0;
let lives      = 3;
let streak     = 0;
let maxStreak  = 0;
let totalQ     = 0;
let totalRight = 0;
let timerVal   = 30;
let timerInterval = null;
let currentAnswer = null;
let answerLocked  = false;

/* ── DOM Helpers ── */
const $  = id => document.getElementById(id);
const showPanel = name => {
  ['menu','game','result'].forEach(n => {
    const el = $('panel-' + n);
    if (el) el.classList.toggle('hidden', n !== name);
  });
};

/* ── Toggle Groups ── */
document.querySelectorAll('.toggle-group').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const id = group.id;
    if (id === 'group-mode') gameMode = btn.dataset.val;
    if (id === 'group-op')   gameOp   = btn.dataset.val;
    if (id === 'group-dif')  gameDif  = btn.dataset.val;
  });
});

/* ── Start ── */
$('btn-start').addEventListener('click', startGame);
$('btn-replay')?.addEventListener('click', startGame);
$('btn-menu-back')?.addEventListener('click', () => {
  showPanel('menu');
  setCat('menu-cat', 'idle');
  clearInterval(timerInterval);
});

function startGame() {
  score = 0; lives = 3; streak = 0; maxStreak = 0;
  totalQ = 0; totalRight = 0; answerLocked = false;
  clearInterval(timerInterval);
  SFX.start();
  updateHUD();
  $('hud-timer-wrap').style.visibility = gameMode === 'timed' ? 'visible' : 'hidden';
  showPanel('game');
  nextQuestion();
}

/* ── HUD ── */
function updateHUD() {
  $('g-score').textContent  = score;
  $('g-streak').textContent = streak + (streak >= 3 ? '🔥' : '');
  let h = '';
  for (let i = 0; i < 3; i++) h += i < lives ? '❤️' : '🖤';
  $('g-lives').textContent = h;
}

/* ── Cat helpers ── */
function setCat(elId, state) {
  const el = $(elId);
  if (el) el.textContent = CATS[state] || CATS.idle;
}
function randPhrase(key) {
  const arr = CAT_PHRASES[key];
  return arr[Math.floor(Math.random() * arr.length)];
}
function setSpeech(txt) {
  const el = $('cat-speech');
  if (el) el.textContent = txt;
}

/* ── Question generation ── */
function getRange() {
  return { easy: [1,10], medium: [5,50], hard: [10,100] }[gameDif];
}
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function genQuestion() {
  const [lo, hi] = getRange();
  const ops = gameOp === 'mixed' ? ['suma','resta','multi','div'] : [gameOp];
  const op  = ops[rnd(0, ops.length - 1)];
  let a, b, q, ans;

  switch (op) {
    case 'suma':
      a = rnd(lo, hi); b = rnd(lo, hi);
      q = `${a} + ${b}`; ans = a + b; break;
    case 'resta':
      b = rnd(lo, hi); a = rnd(b, hi + b);
      q = `${a} − ${b}`; ans = a - b; break;
    case 'multi': {
      const cap = { easy:10, medium:15, hard:20 }[gameDif];
      a = rnd(1, cap); b = rnd(1, cap);
      q = `${a} × ${b}`; ans = a * b; break;
    }
    case 'div': {
      const cap = { easy:10, medium:15, hard:20 }[gameDif];
      b = rnd(1, cap); ans = rnd(1, cap); a = b * ans;
      q = `${a} ÷ ${b}`; break;
    }
  }
  return { q, ans };
}

function genOptions(correct) {
  const set = new Set([correct]);
  let attempts = 0;
  while (set.size < 4 && attempts < 50) {
    attempts++;
    const delta = rnd(1, Math.max(4, Math.floor(Math.abs(correct) * 0.35 + 1)));
    const candidate = correct + (Math.random() < 0.5 ? 1 : -1) * delta;
    if (candidate >= 0 && candidate !== correct) set.add(candidate);
  }
  return [...set].sort(() => Math.random() - 0.5);
}

/* ── Next Question ── */
function nextQuestion() {
  answerLocked = false;
  clearInterval(timerInterval);
  const { q, ans } = genQuestion();
  currentAnswer = ans;

  $('q-text').textContent = q;
  setCat('game-cat', 'think');
  setSpeech('🤔 ...');

  const grid = $('options-grid');
  grid.innerHTML = '';
  genOptions(ans).forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => checkAnswer(opt, btn));
    grid.appendChild(btn);
  });

  $('feedback-flash').classList.remove('show');

  if (gameMode === 'timed') {
    timerVal = { easy:30, medium:20, hard:12 }[gameDif];
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timerVal--;
      updateTimerDisplay();
      if (timerVal <= 4) SFX.tick();
      if (timerVal <= 0) {
        clearInterval(timerInterval);
        onTimeout();
      }
    }, 1000);
  }
  totalQ++;
}

function updateTimerDisplay() {
  const el = $('g-timer');
  el.textContent = timerVal;
  el.classList.toggle('urgent', timerVal <= 5);
}

/* ── Check Answer ── */
function checkAnswer(val, btn) {
  if (answerLocked) return;
  answerLocked = true;
  clearInterval(timerInterval);

  if (val === currentAnswer) {
    totalRight++;
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    const bonus = streak >= 5 ? 30 : streak >= 3 ? 20 : 10;
    score += bonus;

    btn.classList.add('correct');
    btn.classList.add('anim-pop');

    if (streak >= 3) {
      setCat('game-cat', 'cheer');
      setSpeech(randPhrase('streak'));
      SFX.streak();
    } else {
      setCat('game-cat', 'happy');
      setSpeech(randPhrase('happy'));
      SFX.correct();
    }
    flash('✅ +' + bonus);
    updateHUD();
    setTimeout(nextQuestion, 900);

  } else {
    streak = 0;
    btn.classList.add('wrong');
    btn.classList.add('anim-shake');
    document.querySelectorAll('.opt-btn').forEach(b => {
      if (parseInt(b.textContent) === currentAnswer) b.classList.add('correct');
    });
    setCat('game-cat', 'sad');
    setSpeech(randPhrase('sad'));
    SFX.wrong();
    flash('❌');
    loseLife();
  }
}

function onTimeout() {
  if (answerLocked) return;
  answerLocked = true;
  streak = 0;
  setCat('game-cat', 'sad');
  setSpeech(randPhrase('time'));
  SFX.wrong();
  flash('⏰');
  updateHUD();
  loseLife();
}

function loseLife() {
  lives--;
  updateHUD();
  if (lives <= 0) {
    setTimeout(endGame, 900);
  } else {
    setTimeout(nextQuestion, 900);
  }
}

function flash(text) {
  const el = $('feedback-flash');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 700);
}

/* ── End Game ── */
async function endGame() {
  clearInterval(timerInterval);
  const isWin = lives > 0;

  if (isWin) { SFX.win(); } else { SFX.gameover(); }

  // Save to localStorage (guest high score)
  const hs = parseInt(localStorage.getItem('michis_hs') || '0');
  if (score > hs) localStorage.setItem('michis_hs', score);
  $('local-hs').textContent = Math.max(score, hs);

  // Post score to server (works for guests too)
  try {
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score, mode: gameMode, operation: gameOp,
        difficulty: gameDif, correct: totalRight, total: totalQ
      })
    });
  } catch(e) { /* offline – no problem */ }

  // Show result panel
  $('result-title').textContent   = isWin ? '🎉 ¡Genial, ganaste!' : '😿 ¡Fin de la partida!';
  $('result-score').textContent   = score;
  const pct = totalQ > 0 ? Math.round(totalRight / totalQ * 100) : 0;
  $('result-stats').innerHTML =
    `Aciertos: <strong>${totalRight} / ${totalQ}</strong><br>
     Precisión: <strong>${pct}%</strong><br>
     Racha máxima: <strong>${maxStreak} 🔥</strong>`;
  setCat('result-cat', isWin ? 'win' : 'sad');
  showPanel('result');
}

/* ── Init ── */
setCat('menu-cat', 'idle');
$('local-hs').textContent = localStorage.getItem('michis_hs') || '0';
