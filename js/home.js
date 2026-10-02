import { fetchProducts } from './api.js';
import { renderProductCard } from './ui.js';

const grid = document.querySelector('[data-featured-grid]');
if (grid) {
  try {
    const products = await fetchProducts();
    if (products.length === 0) {
      grid.innerHTML = `
        <p style="color:var(--earth);font-size:0.875rem;grid-column:1/-1;">
          The next piece is being prepared. Follow
          <a href="https://www.instagram.com/aur.thentic_apparel/" target="_blank" rel="noopener" style="text-decoration:underline;">@aur.thentic_apparel</a>
          for the drop.
        </p>`;
    } else {
      grid.innerHTML = products.slice(0, 6).map(renderProductCard).join('');
    }
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--earth);">Unable to load products right now.</p>';
  }
}