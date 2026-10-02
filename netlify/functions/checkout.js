import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SA_PHONE = /^(\+27|0)[6-8][0-9]{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { customer, items } = payload;

  // --- Validate ---
  if (!customer || typeof customer !== 'object') return json(400, { error: 'Missing customer' });
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return json(400, { error: 'Invalid items' });
  }
  if (!EMAIL.test(customer.email || '')) return json(400, { error: 'Invalid email' });
  if (!SA_PHONE.test((customer.phone || '').replace(/\s/g, ''))) {
    return json(400, { error: 'Invalid South African phone number' });
  }
  for (const f of ['firstName', 'lastName', 'addressLine1', 'city', 'postalCode']) {
    if (!customer[f] || String(customer[f]).length < 1) {
      return json(400, { error: `Missing ${f}` });
    }
  }
  if (customer.deliveryMethod !== 'pargo-pickup' && customer.deliveryMethod !== 'pargo-home') {
    return json(400, { error: 'Invalid delivery method' });
  }

  // --- Load variants & products ---
  const variantIds = items.map((i) => i.variantId).filter((v) => typeof v === 'string');
  if (variantIds.length !== items.length) return json(400, { error: 'Invalid variant ids' });

  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id, size, stock, products(name, price_cents, status)')
    .in('id', variantIds);

  if (vErr || !variants) return json(500, { error: 'Could not load products' });

  // --- Recalculate totals server-side ---
  let subtotalCents = 0;
  const lines = [];
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return json(400, { error: 'Invalid quantity' });
    const v = variants.find((x) => x.id === item.variantId);
    if (!v) return json(400, { error: 'Variant not found' });
    const p = v.products;
    if (!p || p.status !== 'active') return json(400, { error: 'Product unavailable' });
    if (v.stock < qty) return json(409, { error: `Insufficient stock for size ${v.size}` });
    subtotalCents += p.price_cents * qty;
    lines.push({
      product_id: v.product_id,
      variant_id: v.id,
      product_name: p.name,
      size: v.size,
      quantity: qty,
      unit_price_cents: p.price_cents,
    });
  }

  const shippingCents = customer.deliveryMethod === 'pargo-pickup' ? 6500 : 9500;
  const totalCents = subtotalCents + shippingCents;

  // --- Insert order ---
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      email: customer.email,
      phone: customer.phone,
      shipping_name: `${customer.firstName} ${customer.lastName}`,
      shipping_address: `${customer.addressLine1} ${customer.addressLine2 || ''}`.trim(),
      shipping_city: customer.city,
      shipping_postal_code: customer.postalCode,
      shipping_method: customer.deliveryMethod,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      payment_status: 'pending',
    })
    .select()
    .single();

  if (oErr || !order) return json(500, { error: 'Could not create order' });

  const { error: iErr } = await supabase
    .from('order_items')
    .insert(lines.map((l) => ({ ...l, order_id: order.id })));

  if (iErr) {
    await supabase.from('orders').delete().eq('id', order.id);
    return json(500, { error: 'Could not create order items' });
  }

  // --- Create Yoco checkout ---
  const secret = process.env.YOCO_SECRET_KEY;
  if (!secret) return json(500, { error: 'Payment provider not configured' });
  const siteUrl = process.env.SITE_URL || 'https://aurthentic.co.za';

  const yocoRes = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: totalCents,
      currency: 'ZAR',
      successUrl: `${siteUrl}/success.html?order=${order.id}`,
      cancelUrl: `${siteUrl}/checkout.html?cancelled=true`,
      failureUrl: `${siteUrl}/checkout.html?failed=true`,
      metadata: { orderId: order.id },
    }),
  });

  if (!yocoRes.ok) {
    const errText = await yocoRes.text();
    console.error('[yoco]', yocoRes.status, errText);
    return json(502, { error: 'Payment provider error' });
  }

  const yoco = await yocoRes.json();

  await supabase
    .from('orders')
    .update({ yoco_checkout_id: yoco.id })
    .eq('id', order.id);

  return json(200, { orderId: order.id, redirectUrl: yoco.redirectUrl });
}