import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function verify(raw, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return { statusCode: 500, body: 'Server misconfigured' };

  const raw = event.body || '';
  const signature = event.headers['x-yoco-signature'] || event.headers['X-Yoco-Signature'] || '';

  if (!verify(raw, signature, secret)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let ev;
  try {
    ev = JSON.parse(raw);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const orderId = ev?.metadata?.orderId;
  if (!orderId) return { statusCode: 200, body: 'ok' };

  if (ev.type === 'payment.succeeded') {
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_reference: ev.id })
      .eq('id', orderId);

    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    if (items) {
      for (const item of items) {
        await supabase.rpc('decrement_stock', {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
        });
      }
    }
  } else if (ev.type === 'payment.failed') {
    await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId);
  }

  return { statusCode: 200, body: 'ok' };
}