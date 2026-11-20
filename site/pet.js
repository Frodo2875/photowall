const pet = document.querySelector('.photowall-pet');
const storageKey = 'photowall-pet-position';
const clickPoses = ['wave', 'cheer', 'heart'];
const idlePoses = ['think', 'nap'];
const poseDuration = { wave: 1400, cheer: 1150, heart: 1450, think: 2200, nap: 3500 };
const edge = 12;
const limit = (value, max) => Math.min(max, Math.max(0, value));

let position = { x: 1, y: 1 };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
    position = { x: limit(saved.x, 1), y: limit(saved.y, 1) };
  }
} catch {
  // The pet remains draggable when browser storage is unavailable.
}

function travelBounds() {
  return {
    x: Math.max(0, document.documentElement.clientWidth - pet.offsetWidth - edge * 2),
    y: Math.max(0, window.innerHeight - pet.offsetHeight - edge * 2),
  };
}

function renderPosition() {
  const bounds = travelBounds();
  pet.style.left = `${edge + bounds.x * position.x}px`;
  pet.style.top = `${edge + bounds.y * position.y}px`;
}

function moveTo(x, y) {
  const bounds = travelBounds();
  if (bounds.x) position.x = limit(x - edge, bounds.x) / bounds.x;
  if (bounds.y) position.y = limit(y - edge, bounds.y) / bounds.y;
  renderPosition();
}

function savePosition() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // The current page keeps the new position.
  }
}

let idleTimer;
let poseTimer;
let lastClickPose;
let drag;
let suppressClick = false;

function rest() {
  clearTimeout(poseTimer);
  pet.dataset.pose = 'rest';
}

function react(pool, lastPose) {
  const choices = pool.filter((pose) => pose !== lastPose);
  const pose = choices[Math.floor(Math.random() * choices.length)];
  clearTimeout(poseTimer);
  pet.dataset.pose = pose;
  poseTimer = setTimeout(rest, poseDuration[pose]);
  return pose;
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  if (document.hidden) return;
  idleTimer = setTimeout(() => {
    if (!drag && !document.querySelector('.pswp--open')) {
      react(idlePoses);
    }
    scheduleIdle();
  }, 60_000 + Math.floor(Math.random() * 60_001));
}

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || drag) return;
  event.preventDefault();
  if (event.pointerType === 'mouse') pet.focus({ preventScroll: true });
  const rect = pet.getBoundingClientRect();
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: rect.left,
    top: rect.top,
    moved: false,
  };
  suppressClick = false;
  clearTimeout(idleTimer);
  pet.setPointerCapture(event.pointerId);
});
pet.addEventListener('dragstart', (event) => event.preventDefault());

function updateDrag(event) {
  if (event.pointerId !== drag?.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    pet.classList.add('is-dragging');
    rest();
  }
  moveTo(drag.left + dx, drag.top + dy);
}

pet.addEventListener('pointermove', updateDrag);

function finishDrag(event) {
  if (event.pointerId !== drag?.id) return;
  if (event.type === 'pointerup') updateDrag(event);
  suppressClick = drag.moved;
  if (drag.moved) savePosition();
  drag = undefined;
  pet.classList.remove('is-dragging');
  scheduleIdle();
}

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  pet.addEventListener(type, finishDrag);
}

pet.addEventListener('click', (event) => {
  if (suppressClick && event.detail > 0) return;
  lastClickPose = react(clickPoses, lastClickPose);
  scheduleIdle();
});

const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
pet.addEventListener('keydown', (event) => {
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const rect = pet.getBoundingClientRect();
  moveTo(rect.left + direction[0] * 16, rect.top + direction[1] * 16);
  savePosition();
  scheduleIdle();
});

window.addEventListener('resize', renderPosition);
window.addEventListener('pageshow', scheduleIdle);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) rest();
  scheduleIdle();
});

const sprite = new Image();
sprite.src = new URL('./pet-poses.webp', import.meta.url);
sprite.decode().then(() => {
  pet.hidden = false;
  renderPosition();
  scheduleIdle();
}).catch(() => {
  // Leave the control hidden if its artwork cannot load.
});
