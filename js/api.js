import { CONFIG } from './config.js';

// Loads products from Supabase REST if configured, otherwise from fallback JSON.
export async function fetchProducts() {
  const { url, anonKey } = CONFIG.supabase;

  if (url && anonKey) {
    const res = await fetch(
      `${url}/rest/v1/products?select=*,collections(name,season),product_images(*),product_variants(*)&status=eq.active&order=created_at.asc`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      return rows.map(mapProduct);
    }
  }

  // Fallback
  const res = await fetch('/data/products.fallback.json');
  return res.json();
}

export async function fetchProductBySlug(slug) {
  const { url, anonKey } = CONFIG.supabase;

  if (url && anonKey) {
    const res = await fetch(
      `${url}/rest/v1/products?select=*,collections(name,season),product_images(*),product_variants(*)&status=eq.active&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows[0]) return mapProduct(rows[0]);
    }
  }

  const all = await fetch('/data/products.fallback.json').then((r) => r.json());
  return all.find((p) => p.slug === slug) || null;
}

function mapProduct(row) {
  const priceCents = row.price_cents ?? Math.round((row.price ?? 0) * 100);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: priceCents / 100,
    description: row.description || '',
    concept: row.concept || '',
    collection: row.collections?.name || row.collection || '',
    season: row.collections?.season || row.season || '',
    images: (row.product_images || row.images || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => ({ url: i.url, alt: i.alt_text || row.name })),
    variants: (row.product_variants || row.variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      stock: v.stock,
    })),
  };
}