import { cart } from './cart.js';
import { CONFIG } from './config.js';

/* ---------- Formatting ---------- */
export function formatZAR(amount) {
  return `${CONFIG.currencySymbol}${amount.toFixed(2)}`;
}

/* ---------- Nav behaviour ---------- */
export function initNav() {
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const menuBtn = document.querySelector('[data-menu-open]');
  const menuClose = document.querySelector('[data-menu-close]');
  const menu = document.querySelector('.mobile-menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => menu.classList.add('is-open'));
  }
  if (menuClose && menu) {
    menuClose.addEventListener('click', () => menu.classList.remove('is-open'));
  }
}

/* ---------- Cart drawer ---------- */
export function initCartDrawer() {
  const drawer = document.querySelector('[data-cart-drawer]');
  const openBtns = document.querySelectorAll('[data-cart-open]');
  const closeBtn = drawer?.querySelector('[data-cart-close]');
  const backdrop = drawer?.querySelector('.drawer__backdrop');

  const open = () => {
    drawer?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
  };
  const close = () => {
    drawer?.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  openBtns.forEach((b) => b.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  cart.subscribe(() => {
    updateCartCount();
    if (drawer?.classList.contains('is-open')) renderCartDrawer();
  });
  updateCartCount();

  window.__openCart = open;
}

function updateCartCount() {
  const el = document.querySelector('[data-cart-count]');
  if (!el) return;
  const n = cart.count();
  el.textContent = String(n);
  el.classList.toggle('is-visible', n > 0);
}

function renderCartDrawer() {
  const body = document.querySelector('[data-cart-drawer-body]');
  const footer = document.querySelector('[data-cart-drawer-footer]');
  if (!body) return;

  const items = cart.items;

  if (items.length === 0) {
    body.innerHTML = `
      <div class="drawer__empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Your cart is empty.</p>
        <button class="btn btn--outline" data-cart-close-inner>Continue shopping</button>
      </div>`;
    if (footer) footer.style.display = 'none';
    body.querySelector('[data-cart-close-inner]')?.addEventListener('click', () => {
      document.querySelector('[data-cart-drawer]')?.classList.remove('is-open');
      document.body.style.overflow = '';
    });
    return;
  }

  if (footer) footer.style.display = '';
  body.innerHTML = items.map(renderCartLine).join('');
  bindCartLineEvents();
  renderCartFooter();
}

function renderCartLine(item) {
  return `
    <div class="cart-line" data-variant="${escapeAttr(item.variantId)}">
      <div class="cart-line__media">
        ${item.image ? `<img src="${escapeAttr(item.image)}" alt="" loading="lazy">` : ''}
      </div>
      <div>
        <div class="cart-line__head">
          <div>
            <div class="cart-line__name">${escapeHtml(item.name)}</div>
            <div class="cart-line__meta">Size ${escapeHtml(item.size)}</div>
          </div>
          <button class="cart-line__remove" data-remove aria-label="Remove ${escapeAttr(item.name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="cart-line__row">
          <div class="cart-line__qty">
            <button data-dec aria-label="Decrease">−</button>
            <span>${item.quantity}</span>
            <button data-inc aria-label="Increase">+</button>
          </div>
          <div>${formatZAR(item.price * item.quantity)}</div>
        </div>
      </div>
    </div>`;
}

function bindCartLineEvents() {
  document.querySelectorAll('[data-cart-drawer] .cart-line').forEach((line) => {
    const variantId = line.dataset.variant;
    line.querySelector('[data-remove]')?.addEventListener('click', () => cart.remove(variantId));
    line.querySelector('[data-inc]')?.addEventListener('click', () => {
      const item = cart.items.find((i) => i.variantId === variantId);
      if (item) cart.updateQuantity(variantId, item.quantity + 1);
    });
    line.querySelector('[data-dec]')?.addEventListener('click', () => {
      const item = cart.items.find((i) => i.variantId === variantId);
      if (!item) return;
      if (item.quantity <= 1) cart.remove(variantId);
      else cart.updateQuantity(variantId, item.quantity - 1);
    });
  });
}

function renderCartFooter() {
  const footer = document.querySelector('[data-cart-drawer-footer]');
  if (!footer) return;
  const sub = cart.subtotal();
  footer.innerHTML = `
    <div class="cart-summary">
      <span class="cart-summary__label">Subtotal</span>
      <span>${formatZAR(sub)}</span>
    </div>
    <p style="font-size:0.75rem;color:var(--earth);">
      Shipping calculated at checkout. Delivered across South Africa.
    </p>
    <a href="/checkout.html" class="btn btn--full">Checkout</a>
    <a href="/collection.html" class="btn btn--ghost" style="justify-content:center;">Continue shopping</a>
  `;
}

/* ---------- Product rendering helpers ---------- */
export function renderProductCard(p) {
  const img = p.images[0];
  return `
    <a class="product-card" href="/product.html?slug=${encodeURIComponent(p.slug)}">
      <div class="product-card__media">
        ${img ? `<img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.alt)}" loading="lazy">` : `<div class="skeleton" style="width:100%;height:100%"></div>`}
      </div>
      <div class="product-card__info">
        <div>
          <div class="product-card__name">${escapeHtml(p.name)}</div>
          ${p.collection ? `<div class="product-card__collection">${escapeHtml(p.collection)}</div>` : ''}
        </div>
        <div class="product-card__price">${formatZAR(p.price)}</div>
      </div>
    </a>`;
}

/* ---------- Safe string helpers ---------- */
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

/* ---------- Toast ---------- */
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.style.cssText = `
      position: fixed; left: 50%; bottom: 2rem; transform: translateX(-50%);
      background: var(--chalk); color: var(--void); padding: 0.875rem 1.5rem;
      font-size: var(--fs-label); letter-spacing: 0.15em; text-transform: uppercase;
      font-weight: 500; z-index: 100; animation: fadeIn 200ms;
    `;
    document.body.appendChild(el);
  }
  el.textContent = message;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 2400);
}