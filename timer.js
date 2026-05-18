// ── TIMER.JS ── Pomodoro timer with pet + multiplayer sync

const timerDisplay = document.getElementById('timer-display');
const timerLabel   = document.getElementById('timer-label');
const startBtn     = document.getElementById('timer-start');
const resetBtn     = document.getElementById('timer-reset');
const modeBtns     = document.querySelectorAll('.mode-btn');

let totalSeconds  = 25 * 60;
let remaining     = totalSeconds;
let interval      = null;
let running       = false;
let currentMode   = 'study'; // 'study' | 'short' | 'long'

const LABELS = {
  study: 'Time to focus! 📖',
  short: '☕ Short break — relax!',
  long:  '🛋️ Long break — recharge!',
};

// ── Render ──
function render() {
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;

  // Update page title so timer is visible even in background tabs
  document.title = running ? `${m}:${s} — Study Buddy 🐸` : 'Study Buddy 🐸';
}

// ── Mode switch ──
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (running) return; // don't switch mid-session
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode  = btn.dataset.mode;
    totalSeconds = parseInt(btn.dataset.minutes) * 60;
    remaining    = totalSeconds;
    timerDisplay.classList.remove('running', 'break-mode');
    if (currentMode !== 'study') timerDisplay.classList.add('break-mode');
    timerLabel.textContent = LABELS[currentMode];
    render();
  });
});

// ── Start / Pause ──
startBtn.addEventListener('click', () => {
  if (running) {
    pauseTimer();
  } else {
    startTimer();
  }
});

function startTimer() {
  running = true;
  startBtn.textContent = '⏸ Pause';
  timerDisplay.classList.add('running');

  if (currentMode === 'study') {
    window.setPetState?.('studying');
    window.broadcastStatus?.('studying');
  } else {
    window.setPetState?.('break');
    window.broadcastStatus?.('break');
  }

  interval = setInterval(() => {
    remaining--;
    render();
    if (remaining <= 0) onTimerEnd();
  }, 1000);
}

function pauseTimer() {
  running = false;
  startBtn.textContent = '▶ Start';
  timerDisplay.classList.remove('running');
  clearInterval(interval);
  window.setPetState?.('idle');
  window.broadcastStatus?.('idle');
}

// ── Reset ──
resetBtn.addEventListener('click', () => {
  pauseTimer();
  remaining = totalSeconds;
  timerLabel.textContent = LABELS[currentMode];
  render();
});

// ── Timer ends ──
function onTimerEnd() {
  clearInterval(interval);
  running = false;
  remaining = 0;
  render();
  startBtn.textContent = '▶ Start';

  if (currentMode === 'study') {
    timerLabel.textContent = '🎉 Session complete! Take a break.';
    window.setPetState?.('dancing');
    window.broadcastStatus?.('break');
    showNotification('Pomodoro done! 🎉 Time for a break.');
    // Auto-switch to short break
    setTimeout(() => {
      modeBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('[data-mode="short"]').classList.add('active');
      currentMode  = 'short';
      totalSeconds = 5 * 60;
      remaining    = totalSeconds;
      timerDisplay.classList.add('break-mode');
      timerLabel.textContent = LABELS.short;
      render();
    }, 2000);
  } else {
    timerLabel.textContent = '✅ Break over — back to work!';
    window.setPetState?.('idle');
    window.broadcastStatus?.('idle');
    showNotification('Break over! Back to studying 📖');
    // Auto-switch back to study
    setTimeout(() => {
      modeBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('[data-mode="study"]').classList.add('active');
      currentMode  = 'study';
      totalSeconds = 25 * 60;
      remaining    = totalSeconds;
      timerDisplay.classList.remove('break-mode');
      timerLabel.textContent = LABELS.study;
      render();
    }, 2000);
  }
}

// ── Browser notification ──
function showNotification(msg) {
  if (Notification.permission === 'granted') {
    new Notification('Study Buddy 🐸', { body: msg, icon: '🐸' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification('Study Buddy 🐸', { body: msg });
    });
  }
}

render();
