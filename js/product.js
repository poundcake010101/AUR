import { fetchProductBySlug } from './api.js';
import { cart } from './cart.js';
import { formatZAR, escapeHtml, toast } from './ui.js';

const root = document.querySelector('[data-product-root]');
const params = new URLSearchParams(location.search);
const slug = params.get('slug');

let state = {
  product: null,
  size: null,
  quantity: 1,
  activeImage: 0,
};

function render() {
  const p = state.product;
  if (!p) return;

  const variant = p.variants.find((v) => v.size === state.size);
  const inStock = variant ? variant.stock > 0 : false;
  const maxQty = variant ? Math.min(variant.stock, 10) : 1;

  root.innerHTML = `
    <div class="container section-tight">
      <div class="product-layout">
        <div>
          <div class="gallery">
            <div class="gallery__main">
              ${p.images[state.activeImage]
                ? `<img src="${p.images[state.activeImage].url}" alt="${escapeHtml(p.images[state.activeImage].alt)}">`
                : `<div class="skeleton" style="width:100%;height:100%"></div>`}
            </div>
            ${p.images.length > 1 ? `
              <div class="gallery__thumbs">
                ${p.images.map((img, i) => `
                  <button class="gallery__thumb ${i === state.activeImage ? 'is-active' : ''}" data-thumb="${i}" aria-label="View image ${i + 1}">
                    <img src="${img.url}" alt="" loading="lazy">
                  </button>
                `).join('')}
              </div>` : ''}
          </div>
        </div>

        <div class="pdp__sticky">
          <div class="eyebrow pdp__season">${escapeHtml(p.collection)} ${p.season ? '— ' + escapeHtml(p.season) : ''}</div>
          <h1 class="pdp__title">${escapeHtml(p.name)}</h1>
          <div class="pdp__price">${formatZAR(p.price)}</div>

          <div class="stack-6" style="margin-bottom:2rem;">
            <div>
              <div class="pdp__block-title">Size</div>
              <div class="sizes">
                ${p.variants.map((v) => `
                  <button class="size-btn ${state.size === v.size ? 'is-selected' : ''}"
                    data-size="${v.size}"
                    ${v.stock === 0 ? 'disabled' : ''}
                    aria-pressed="${state.size === v.size}">
                    ${escapeHtml(v.size)}
                  </button>`).join('')}
              </div>
            </div>

            <div>
              <div class="pdp__block-title">Quantity</div>
              <div class="qty">
                <button class="qty__btn" data-qty-dec ${state.quantity <= 1 ? 'disabled' : ''} aria-label="Decrease quantity">−</button>
                <span class="qty__value">${state.quantity}</span>
                <button class="qty__btn" data-qty-inc ${state.quantity >= maxQty ? 'disabled' : ''} aria-label="Increase quantity">+</button>
              </div>
            </div>
          </div>

          <button class="btn btn--full" data-add ${!state.size || !inStock ? 'disabled' : ''}>
            ${!state.size ? 'Select a size' : !inStock ? 'Sold out' : 'Add to cart'}
          </button>

          ${p.concept ? `
            <div class="pdp__block">
              <div class="pdp__block-title">Concept</div>
              <div class="pdp__body">${escapeHtml(p.concept)}</div>
            </div>` : ''}

          ${p.description ? `
            <div class="pdp__block">
              <div class="pdp__block-title">Details</div>
              <div class="pdp__body">${escapeHtml(p.description)}</div>
            </div>` : ''}

          <div class="pdp__block">
            <div class="pdp__block-title">Shipping</div>
            <div class="pdp__body">Delivered across South Africa. Shipping calculated at checkout. Pargo pickup points available.</div>
          </div>

          <div class="pdp__block">
            <div class="pdp__block-title">Returns</div>
            <div class="pdp__body">Returns accepted within 14 days of delivery for unused items in original condition. Customer covers return shipping. Contact us on WhatsApp to initiate a return.</div>
          </div>
        </div>
      </div>
    </div>

    <script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description,
      image: p.images.map((i) => i.url),
      brand: { '@type': 'Brand', name: 'AUR.THENTIC APPAREL' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ZAR',
        price: p.price,
        availability: p.variants.some((v) => v.stock > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    })}
    </script>
  `;

  bindEvents();
}

function bindEvents() {
  root.querySelectorAll('[data-thumb]').forEach((b) =>
    b.addEventListener('click', () => {
      state.activeImage = Number(b.dataset.thumb);
      render();
    })
  );

  root.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      state.quantity = 1;
      render();
    })
  );

  root.querySelector('[data-qty-inc]')?.addEventListener('click', () => {
    const v = state.product.variants.find((x) => x.size === state.size);
    if (!v) return;
    state.quantity = Math.min(state.quantity + 1, Math.min(v.stock, 10));
    render();
  });
  root.querySelector('[data-qty-dec]')?.addEventListener('click', () => {
    state.quantity = Math.max(1, state.quantity - 1);
    render();
  });

  root.querySelector('[data-add]')?.addEventListener('click', () => {
    const p = state.product;
    const v = p.variants.find((x) => x.size === state.size);
    if (!v) return;
    cart.add({
      productId: p.id,
      variantId: v.id,
      name: p.name,
      slug: p.slug,
      size: v.size,
      price: p.price,
      image: p.images[0]?.url || '',
      quantity: state.quantity,
    });
    toast('Added to cart');
    window.__openCart?.();
  });
}

if (root) {
  if (!slug) {
    root.innerHTML = '<div class="container section"><p>Product not found.</p></div>';
  } else {
    try {
      const product = await fetchProductBySlug(slug);
      if (!product) {
        root.innerHTML = '<div class="container section"><p>Product not found.</p></div>';
      } else {
        document.title = `${product.name} — ${product.collection} | AUR.THENTIC APPAREL`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && product.description) metaDesc.setAttribute('content', product.description.slice(0, 160));
        state.product = product;
        render();
      }
    } catch {
      root.innerHTML = '<div class="container section"><p>Unable to load product.</p></div>';
    }
  }
}