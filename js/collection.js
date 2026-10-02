import { fetchProducts } from './api.js';
import { renderProductCard } from './ui.js';

const grid = document.querySelector('[data-collection-grid]');
const countEl = document.querySelector('[data-collection-count]');

if (grid) {
  try {
    const products = await fetchProducts();
    if (countEl) countEl.textContent = `${products.length} piece${products.length === 1 ? '' : 's'}`;
    if (products.length === 0) {
      grid.innerHTML = '<p style="color:var(--earth);grid-column:1/-1;">No pieces currently available.</p>';
    } else {
      grid.innerHTML = products.map(renderProductCard).join('');
    }
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--earth);">Unable to load the collection.</p>';
  }
}