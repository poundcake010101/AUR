const STORAGE_KEY = 'aur-cart-v1';

const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota or blocked */
  }
  listeners.forEach((fn) => fn(items));
}

export const cart = {
  items: read(),

  subscribe(fn) {
    listeners.add(fn);
    fn(this.items);
    return () => listeners.delete(fn);
  },

  add(item) {
    const items = read();
    const existing = items.find((i) => i.variantId === item.variantId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    this.items = items;
    write(items);
  },

  remove(variantId) {
    const items = read().filter((i) => i.variantId !== variantId);
    this.items = items;
    write(items);
  },

  updateQuantity(variantId, quantity) {
    const items = read();
    const item = items.find((i) => i.variantId === variantId);
    if (!item) return;
    item.quantity = Math.max(1, quantity);
    this.items = items;
    write(items);
  },

  clear() {
    this.items = [];
    write([]);
  },

  count() {
    return read().reduce((sum, i) => sum + i.quantity, 0);
  },

  subtotal() {
    return read().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
};