import typedefs from '@shellicar/build-graphql/typedefs';

const el = document.getElementById('app');
if (el) {
  el.innerHTML = JSON.stringify(typedefs);
}
