// Public config only. Never place secrets here.
export const CONFIG = {
  siteUrl: 'https://aurthentic.co.za',
  whatsapp: '27762734505',
  instagram: 'https://www.instagram.com/aur.thentic_apparel/',
  currency: 'ZAR',
  currencySymbol: 'R',
  supabase: {
    url: window.__ENV?.SUPABASE_URL || '',
    anonKey: window.__ENV?.SUPABASE_ANON_KEY || '',
  },
  shipping: {
    pickupCents: 6500,
    homeCents: 9500,
  },
};