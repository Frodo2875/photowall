import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';

const ZOOM_STEP = 1.35;
const ZOOM_TOLERANCE = 0.001;

const lightbox = new PhotoSwipeLightbox({
  gallery: '.photos',
  children: 'a',
  pswpModule: () => import('./vendor/photoswipe.esm.min.js'),
  closeTitle: '关闭（Esc）',
  zoom: false,
  wheelToZoom: true,
  arrowPrevTitle: '上一张',
  arrowNextTitle: '下一张',
  errorMsg: '无法加载这张照片。',
  paddingFn: ({ x, y }) => ({
    top: 48,
    bottom: 64,
    left: x > 700 ? 44 : 9,
    right: x > 700 ? 44 : 9,
  }),
});

lightbox.on('uiRegister', () => {
  const viewer = lightbox.pswp;
  viewer.on('openingAnimationEnd', () => {
    document.dispatchEvent(new CustomEvent('photowall:viewer-open', { detail: viewer.element }));
  });
  viewer.on('close', () => document.dispatchEvent(new Event('photowall:viewer-close')));
  viewer.on('change', () => {
    const photo = viewer.currSlide?.data.element?.href;
    if (photo) document.dispatchEvent(new CustomEvent('photowall:photo-viewed', { detail: photo }));
  });

  function addZoomButton(name, label, symbol, scale, order) {
    function targetZoom() {
      const slide = viewer.currSlide;
      if (!viewer.opener.isOpen || !slide?.isZoomable()) return null;
      const { initial, max } = slide.zoomLevels;
      const current = slide.currZoomLevel;
      if (scale > 1 && current < max - ZOOM_TOLERANCE) {
        return Math.min(max, current * scale);
      }
      if (scale < 1 && current > initial + ZOOM_TOLERANCE) {
        return Math.max(initial, current * scale);
      }
      return null;
    }

    viewer.ui.registerElement({
      name,
      className: 'pswp__button pswp__button--photo-zoom',
      title: label,
      ariaLabel: label,
      order,
      isButton: true,
      html: `<span aria-hidden="true">${symbol}</span>`,
      onInit: (button) => {
        const sync = () => button.setAttribute('aria-disabled', String(targetZoom() === null));
        sync();
        viewer.on('openingAnimationEnd', sync);
        viewer.on('change', sync);
        viewer.on('zoomPanUpdate', sync);
        viewer.on('loadComplete', sync);
      },
      onClick: () => {
        const zoom = targetZoom();
        if (zoom === null) return;
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
        viewer.currSlide.zoomTo(zoom, undefined, duration);
      },
    });
  }

  addZoomButton('photo-zoom-out', '缩小照片', '−', 1 / ZOOM_STEP, 7);
  addZoomButton('photo-zoom-in', '放大照片', '+', ZOOM_STEP, 8);

  viewer.ui.registerElement({
    name: 'photo-caption',
    className: 'photo-caption',
    appendTo: 'root',
    onInit: (element) => {
      const caption = document.createElement('span');
      const info = document.createElement('button');
      info.type = 'button';
      info.hidden = true;
      info.className = 'photo-info';
      info.textContent = 'ⓘ';
      info.setAttribute('aria-label', '植物简介');
      info.setAttribute('aria-expanded', 'false');
      info.setAttribute('aria-describedby', 'photo-info-tooltip');
      const detail = document.createElement('span');
      detail.id = 'photo-info-tooltip';
      detail.className = 'photo-info-tooltip';
      detail.setAttribute('role', 'tooltip');
      element.append(caption, info, detail);

      let pinned = false;
      let closeTimer;
      function show(visible) {
        clearTimeout(closeTimer);
        detail.classList.toggle('is-visible', visible);
        info.setAttribute('aria-expanded', String(visible));
      }
      function closeSoon() {
        clearTimeout(closeTimer);
        if (!pinned && !info.matches(':focus-visible')) {
          closeTimer = setTimeout(() => show(false), 220);
        }
      }
      info.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') show(true);
      });
      info.addEventListener('pointerleave', closeSoon);
      detail.addEventListener('pointerenter', () => clearTimeout(closeTimer));
      detail.addEventListener('pointerleave', closeSoon);
      info.addEventListener('focus', () => {
        if (info.matches(':focus-visible')) show(true);
      });
      info.addEventListener('blur', () => { pinned = false; show(false); });
      info.addEventListener('click', () => { pinned = !pinned; show(pinned); });
      info.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && detail.classList.contains('is-visible')) {
          event.stopPropagation();
          pinned = false;
          show(false);
        }
      });
      viewer.element.addEventListener('pointerdown', (event) => {
        if (event.target === info || detail.contains(event.target)) return;
        pinned = false;
        show(false);
      });
      viewer.on('destroy', () => clearTimeout(closeTimer));
      viewer.on('change', () => {
        const data = viewer.currSlide.data.element?.dataset;
        caption.textContent = data?.caption || '';
        detail.textContent = data?.description || '';
        info.hidden = !detail.textContent;
        pinned = false;
        show(false);
      });
    },
  });
});
lightbox.init();
