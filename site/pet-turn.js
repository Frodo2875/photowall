const step = 45;
const turnDelay = 2400;
const normalize = (angle) => ((angle % 360) + 360) % 360;

export function enablePetTurn(button, reducedMotion) {
  const overlay = document.createElement('span');
  overlay.className = 'pet-turn';
  overlay.setAttribute('aria-hidden', 'true');
  const layers = [document.createElement('span'), document.createElement('span')];
  overlay.append(...layers);
  button.append(overlay);
  button.classList.add('can-turn');
  button.draggable = false;

  let angle = 0;
  let drag;
  let suppressClick = false;
  let timeout;
  let animation;

  function render(next) {
    angle = normalize(next);
    button.classList.toggle('is-turned', angle !== 0);
    const lower = Math.floor(angle / step);
    const fraction = angle / step - lower;
    // Keep each drawing crisp, blending them only briefly between viewing angles.
    const blend = Math.max(0, Math.min(1, (fraction - .33) / .34));
    layers[0].style.backgroundPositionX = `${lower * 100 / 7}%`;
    layers[0].style.opacity = 1 - blend;
    layers[1].style.backgroundPositionX = `${((lower + 1) % 8) * 100 / 7}%`;
    layers[1].style.opacity = blend;
  }

  function stopReturn() {
    clearTimeout(timeout);
    cancelAnimationFrame(animation);
  }

  function faceFront() {
    stopReturn();
    if (drag || angle === 0) return;
    if (reducedMotion.matches) {
      render(0);
      return;
    }
    const from = angle;
    const distance = from <= 180 ? -from : 360 - from;
    const duration = 340 + Math.abs(distance) * 3;
    const started = performance.now();
    function advance(now) {
      const progress = Math.min(1, (now - started) / duration);
      const ease = progress * progress * (3 - 2 * progress);
      render(progress === 1 ? 0 : from + distance * ease);
      if (progress < 1) animation = requestAnimationFrame(advance);
    }
    animation = requestAnimationFrame(advance);
  }

  function rotate(event) {
    if (event.pointerId !== drag?.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) < 6) return;
    drag.moved = true;
    button.classList.add('is-turning');
    render(drag.angle + distance * 1.8);
  }

  function finish(event) {
    if (event.pointerId !== drag?.id) return;
    if (event.type === 'pointerup') rotate(event);
    suppressClick = drag.moved;
    drag = undefined;
    button.classList.remove('is-turning');
    timeout = setTimeout(faceFront, turnDelay);
  }

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    if (event.pointerType === 'mouse') {
      event.preventDefault();
      button.focus({ preventScroll: true });
    }
    suppressClick = false;
    stopReturn();
    drag = { id: event.pointerId, x: event.clientX, angle, moved: false };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('dragstart', (event) => event.preventDefault());
  button.addEventListener('pointermove', rotate);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, finish);
  }
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    stopReturn();
    render(angle + (event.key === 'ArrowLeft' ? -step : step));
    timeout = setTimeout(faceFront, turnDelay);
  });
  return {
    acceptClick(event) {
      if (suppressClick && event.detail > 0) return false;
      faceFront();
      return true;
    },
  };
}
