import { cart } from './cart.js';
import { CONFIG } from './config.js';
import { formatZAR, escapeHtml } from './ui.js';

const form = document.querySelector('[data-checkout-form]');
const summaryEl = document.querySelector('[data-checkout-summary]');
const errorEl = document.querySelector('[data-checkout-error]');
const submitBtn = document.querySelector('[data-checkout-submit]');

let deliveryMethod = 'pargo-pickup';

function renderSummary() {
  const items = cart.items;
  if (!summaryEl) return;
  if (items.length === 0) {
    summaryEl.innerHTML = '<p style="color:var(--earth);font-size:0.875rem;">Your cart is empty. <a href="/collection.html" style="text-decoration:underline;">Return to shop</a></p>';
    submitBtn?.setAttribute('disabled', '');
    return;
  }

  const sub = cart.subtotal();
  const shippingCents = deliveryMethod === 'pargo-pickup' ? CONFIG.shipping.pickupCents : CONFIG.shipping.homeCents;
  const shipping = shippingCents / 100;
  const total = sub + shipping;

  summaryEl.innerHTML = `
    <p class="eyebrow" style="margin-bottom:1rem;">Order summary</p>
    <div class="checkout-summary__list">
      ${items.map((i) => `
        <div class="checkout-summary__line">
          <span class="checkout-summary__line-name">${escapeHtml(i.name)} / ${escapeHtml(i.size)} &times; ${i.quantity}</span>
          <span>${formatZAR(i.price * i.quantity)}</span>
        </div>`).join('')}
    </div>
    <div class="checkout-summary__line" style="border-top:1px solid var(--whisper);padding-top:1rem;">
      <span class="checkout-summary__line-name">Subtotal</span>
      <span>${formatZAR(sub)}</span>
    </div>
    <div class="checkout-summary__line">
      <span class="checkout-summary__line-name">Shipping</span>
      <span>${formatZAR(shipping)}</span>
    </div>
    <div class="checkout-summary__line" style="border-top:1px solid var(--whisper);padding-top:1rem;font-size:1rem;">
      <span>Total</span>
      <span>${formatZAR(total)}</span>
    </div>
  `;
}

document.querySelectorAll('input[name="deliveryMethod"]').forEach((input) => {
  input.addEventListener('change', () => {
    deliveryMethod = input.value;
    renderSummary();
  });
});

cart.subscribe(renderSummary);
renderSummary();

// Basic client-side validation before submit. Server re-validates everything.
const SA_PHONE = /^(\+27|0)[6-8][0-9]{8}$/;

function validate(data) {
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Please enter a valid email address.';
  if (!SA_PHONE.test(data.phone.replace(/\s/g, ''))) return 'Please enter a valid South African mobile number.';
  if (!data.firstName || data.firstName.length < 1) return 'First name is required.';
  if (!data.lastName || data.lastName.length < 1) return 'Last name is required.';
  if (!data.addressLine1 || data.addressLine1.length < 3) return 'Address is required.';
  if (!data.city || data.city.length < 2) return 'City is required.';
  if (!data.postalCode || data.postalCode.length < 4) return 'Postal code is required.';
  return null;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  if (cart.items.length === 0) {
    errorEl.textContent = 'Your cart is empty.';
    return;
  }

  const fd = new FormData(form);
  const data = {
    email: String(fd.get('email') || '').trim(),
    phone: String(fd.get('phone') || '').trim(),
    firstName: String(fd.get('firstName') || '').trim(),
    lastName: String(fd.get('lastName') || '').trim(),
    addressLine1: String(fd.get('addressLine1') || '').trim(),
    addressLine2: String(fd.get('addressLine2') || '').trim(),
    city: String(fd.get('city') || '').trim(),
    postalCode: String(fd.get('postalCode') || '').trim(),
    notes: String(fd.get('notes') || '').trim(),
    deliveryMethod,
  };

  const err = validate(data);
  if (err) {
    errorEl.textContent = err;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: data,
        items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body.redirectUrl) {
      errorEl.textContent = body.error || 'Checkout failed. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay with Yoco';
      return;
    }

    cart.clear();
    window.location.href = body.redirectUrl;
  } catch {
    errorEl.textContent = 'Network error. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Pay with Yoco';
  }
});