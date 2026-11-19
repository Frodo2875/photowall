const year = document.querySelector('#year');
const filters = [...document.querySelectorAll('[data-filter]')];
const albums = [...document.querySelectorAll('[data-album]')];
const count = document.querySelector('#album-count');
const empty = document.querySelector('#empty');
let category = '';

function render() {
  const matches = albums.filter((album) => {
    const show = (!year.value || year.value === album.dataset.year)
      && (!category || category === album.dataset.category);
    album.hidden = !show;
    return show;
  });
  for (const button of filters) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === category));
  }
  count.textContent = `${matches.length} 本相册`;
  empty.hidden = matches.length !== 0;
}

function readURL() {
  const params = new URLSearchParams(location.search);
  const requestedYear = params.get('year');
  const requestedType = params.get('type');
  year.value = Array.from(year.options).some((option) => option.value === requestedYear)
    ? requestedYear : '';
  category = filters.some((button) => button.dataset.filter === requestedType)
    ? requestedType : '';
  render();
}

function saveFilters() {
  const url = new URL(location.href);
  url.searchParams.delete('year');
  url.searchParams.delete('type');
  if (year.value) url.searchParams.set('year', year.value);
  if (category) url.searchParams.set('type', category);
  history.replaceState(null, '', url);
  render();
}

for (const button of filters) {
  button.addEventListener('click', () => {
    category = button.dataset.filter;
    saveFilters();
  });
}
year.addEventListener('change', saveFilters);
document.querySelector('#clear-filters').addEventListener('click', () => {
  year.value = '';
  category = '';
  saveFilters();
  filters[0].focus();
});
window.addEventListener('popstate', readURL);
readURL();
