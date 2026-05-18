// ── PET.JS ── Animated study companion

const pet       = document.getElementById('pet');
const petSpeech = document.getElementById('pet-speech');

let speechTimeout = null;

// ── States ──
// 'idle'     : default bounce
// 'studying' : timer running
// 'break'    : timer on break
// 'dancing'  : break ends / session complete
// 'sleeping' : idle for too long

const PET_MESSAGES = {
  idle:     ["Let's get started! 📚", "Ready when you are 🐸", "You've got this! 💪"],
  studying: ["Focus mode 🔥", "You're on a roll!", "Keep going! 📖", "Deep work 🧠"],
  break:    ["Take a breather 🌿", "Stretch a little! 🙆", "Hydrate! 💧", "Good work so far!"],
  dancing:  ["Session done! 🎉", "Amazing work! 🥳", "You crushed it! 🎊"],
  sleeping: ["Zzz... 😴", "Wake me when ready", "Napping... 💤"],
};

function setPetState(state) {
  pet.className = `state-${state}`;
  showSpeech(randomFrom(PET_MESSAGES[state] || PET_MESSAGES.idle));
}

function showSpeech(msg) {
  petSpeech.textContent = msg;
  petSpeech.classList.remove('hidden');
  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => petSpeech.classList.add('hidden'), 3500);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Click pet to get encouragement ──
pet.addEventListener('click', () => {
  const currentState = pet.className.replace('state-', '') || 'idle';
  showSpeech(randomFrom(PET_MESSAGES[currentState] || PET_MESSAGES.idle));
});

// ── Sleep after 5 min of idle ──
let idleTimer = null;
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pet.className === 'state-idle' || pet.className === '') setPetState('sleeping');
  }, 5 * 60 * 1000);
}
document.addEventListener('mousemove', resetIdle);
document.addEventListener('keydown', () => {
  if (pet.className.includes('sleeping')) setPetState('idle');
  resetIdle();
});
resetIdle();

// Initial greeting
setTimeout(() => showSpeech("Hey! I'm your study buddy 🐸"), 800);

// Export so other modules can call setPetState
window.setPetState = setPetState;
