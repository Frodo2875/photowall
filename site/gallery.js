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
      viewer.on('change', () => {
        element.textContent = viewer.currSlide.data.element?.dataset.caption || '';
      });
    },
  });
});
lightbox.init();
