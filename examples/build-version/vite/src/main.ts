import version from '@shellicar/build-version/version';

const el = document.getElementById('app');
if (el) {
  el.innerHTML = JSON.stringify(version);
}
