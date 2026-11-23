import { petMotion, settledFrame } from './pet-motion.js';

const revision = new URL(import.meta.url).search;
const { browsingLine, clickLines, idleLine, rapidClickLine } = await import('./pet-lines.js' + revision);

const pet = document.querySelector('.photowall-pet');
const button = pet.querySelector('.pet-button');
const dialogue = pet.querySelector('.pet-dialogue');
const text = pet.querySelector('.pet-dialogue-text');
const announcement = pet.querySelector('.pet-announcement');
const dismiss = pet.querySelector('.pet-dismiss');
const home = pet.parentElement;
const sprite = pet.querySelector('.pet-sprite');
const frames = new Map([...sprite.querySelectorAll('[data-frame]')].map((frame) => [frame.dataset.frame, frame]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const idleDelay = 30_000;
const photoWindow = 45_000;
const photoCooldown = 60_000;
const historyKey = 'photowall-pet-photo-views';

let poseTimer;
let motion;
let currentFrame = frames.get('rest');
let dialogueTimer;
let idleTimer;
let followUp;
let clickBag = [];
let lastLine;
let lastTap = -Infinity;
let taps = 0;
let photos = [];
let lastBrowse = 0;
let turn;

try {
  const history = JSON.parse(sessionStorage.getItem(historyKey));
  if (Array.isArray(history?.photos)) photos = history.photos;
  if (Number.isFinite(history?.lastBrowse)) lastBrowse = history.lastBrowse;
} catch {
  // Counting still works within the current page if storage is blocked.
}

function setPose(pose) {
  const nextFrame = frames.get(pose);
  if (nextFrame !== currentFrame) {
    currentFrame.classList.remove('is-current');
    nextFrame.classList.add('is-current');
    currentFrame = nextFrame;
  }
  pet.dataset.pose = pose;
  const from = motion ? getComputedStyle(sprite).transform : 'none';
  motion?.cancel();
  motion = undefined;
  const action = petMotion[pose];
  if (!reducedMotion.matches && (action || from !== 'none')) {
    motion = sprite.animate([
      { offset: 0, transform: from, easing: 'ease-in-out' },
      ...(action?.frames ?? []),
      settledFrame,
    ], { duration: action?.duration ?? 185 });
  }
  return action?.duration ?? 0;
}

function resetPose() {
  clearTimeout(poseTimer);
  setPose('rest');
}

function hideDialogue() {
  clearTimeout(dialogueTimer);
  if (document.activeElement === dismiss) {
    const focusTarget = pet.parentElement === home ? button : pet.parentElement;
    focusTarget.focus({ preventScroll: true });
  }
  dialogue.hidden = true;
  announcement.textContent = '';
  delete pet.dataset.speaking;
  followUp = undefined;
  resetPose();
}

function speak(line) {
  clearTimeout(poseTimer);
  clearTimeout(dialogueTimer);
  const duration = setPose(line.pose);
  pet.dataset.speaking = 'true';
  followUp = line.followUp;
  text.textContent = line.text;
  dialogue.hidden = false;
  announcement.textContent = line.text;
  poseTimer = setTimeout(resetPose, duration + 160);
  const readingTime = Math.min(12_000, Math.max(6000, 3800 + line.text.length * 130));
  dialogueTimer = setTimeout(hideDialogue, readingTime);
}

function takeClickLine() {
  if (!clickBag.length) clickBag = [...clickLines];
  const choices = clickBag.length > 1 ? clickBag.filter((line) => line !== lastLine) : clickBag;
  const line = choices[Math.floor(Math.random() * choices.length)];
  clickBag = clickBag.filter((candidate) => candidate !== line);
  lastLine = line;
  return line;
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  if (!document.hidden && !pet.hidden) {
    idleTimer = setTimeout(() => speak(idleLine), idleDelay);
  }
}

button.addEventListener('click', (event) => {
  if (turn && !turn.acceptClick(event)) return;
  const now = performance.now();
  taps = now - lastTap <= 2000 ? taps + 1 : 1;
  lastTap = now;
  if (taps === 5) {
    taps = 0;
    speak(rapidClickLine);
  } else {
    speak(followUp ?? takeClickLine());
  }
  scheduleIdle();
});

dismiss.addEventListener('click', () => {
  hideDialogue();
  scheduleIdle();
});

for (const type of ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel']) {
  window.addEventListener(type, scheduleIdle, { passive: true, capture: true });
}
window.addEventListener('pageshow', scheduleIdle);
document.addEventListener('visibilitychange', scheduleIdle);
reducedMotion.addEventListener('change', (event) => {
  if (!event.matches) return;
  motion?.cancel();
  motion = undefined;
});

document.addEventListener('photowall:viewer-open', (event) => event.detail.append(pet));
document.addEventListener('photowall:viewer-close', () => home.append(pet));
document.addEventListener('photowall:photo-viewed', ({ detail: photo }) => {
  const now = Date.now();
  photos = photos.filter((entry) => now - entry.time <= photoWindow && entry.photo !== photo);
  photos.push({ photo, time: now });
  if (photos.length >= 3 && now - lastBrowse >= photoCooldown && !document.hidden) {
    lastBrowse = now;
    photos = [];
    speak(browsingLine);
  }
  try {
    sessionStorage.setItem(historyKey, JSON.stringify({ photos, lastBrowse }));
  } catch {
    // The current page keeps its viewing history.
  }
  scheduleIdle();
});

const preload = (name) => {
  const image = new Image();
  image.src = new URL(name, import.meta.url);
  return image.decode();
};

Promise.all([preload('./pet-poses-hd.webp'), preload('./pet-scenes-hd.webp')]).then(() => {
  pet.hidden = false;
  scheduleIdle();
  return Promise.all([preload('./pet-turns.webp'), import('./pet-turn.js' + revision)]).then(([, { enablePetTurn }]) => {
    turn = enablePetTurn(button, reducedMotion);
    button.setAttribute('aria-label', '蓝鲸少女，点击互动，左右拖动或按方向键转身');
  });
}).catch(() => {
  // An unavailable turnaround sheet should not prevent basic interaction.
});
