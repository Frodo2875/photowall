import { browsingLine, clickLines, idleLine, rapidClickLine } from './pet-lines.js';

const pet = document.querySelector('.photowall-pet');
const button = pet.querySelector('.pet-button');
const dialogue = pet.querySelector('.pet-dialogue');
const text = pet.querySelector('.pet-dialogue-text');
const announcement = pet.querySelector('.pet-announcement');
const dismiss = pet.querySelector('.pet-dismiss');
const home = pet.parentElement;
const idleDelay = 30_000;
const photoWindow = 45_000;
const photoCooldown = 60_000;
const historyKey = 'photowall-pet-photo-views';

let poseTimer;
let dialogueTimer;
let idleTimer;
let followUp;
let clickBag = [];
let lastLine;
let lastTap = -Infinity;
let taps = 0;
let photos = [];
let lastBrowse = 0;

try {
  const history = JSON.parse(sessionStorage.getItem(historyKey));
  if (Array.isArray(history?.photos)) photos = history.photos;
  if (Number.isFinite(history?.lastBrowse)) lastBrowse = history.lastBrowse;
} catch {
  // Counting still works within the current page if storage is blocked.
}

function resetPose() {
  clearTimeout(poseTimer);
  pet.dataset.pose = 'rest';
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
  pet.dataset.pose = line.pose;
  pet.dataset.speaking = 'true';
  followUp = line.followUp;
  text.textContent = line.text;
  dialogue.hidden = false;
  announcement.textContent = line.text;
  poseTimer = setTimeout(resetPose, line.pose === 'doze' ? 2800 : 1550);
  dialogueTimer = setTimeout(hideDialogue, Math.max(7000, line.text.length * 145));
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

button.addEventListener('click', () => {
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

Promise.all([preload('./pet-poses.webp'), preload('./pet-scenes.webp')]).then(() => {
  pet.hidden = false;
  scheduleIdle();
}).catch(() => {
  // Leave the companion hidden if its artwork cannot load.
});
