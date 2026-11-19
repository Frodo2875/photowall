import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';

const lightbox = new PhotoSwipeLightbox({
  gallery: '.photos',
  children: 'a',
  pswpModule: () => import('./vendor/photoswipe.esm.min.js'),
  closeTitle: '关闭（Esc）',
  zoomTitle: '放大或缩小',
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
