/**
 * Vercel Cron Job — runs daily at 20:30 (Spain time)
 * Fetches all station prices from the Ministry API and saves them to Supabase.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const MINISTRY_URL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const FUEL_MAP: Record<string, string> = {
  'Precio Gasolina 95 E5':        'G95E5',
  'Precio Gasolina 98 E5':        'G98E5',
  'Precio Gasoleo A':             'GOA',
  'Precio Gasoleo Premium':       'GPR',
  'Precio Gases licuados del petroleo': 'GLP',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security: only allow Vercel cron or internal calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Fetch stations from Ministry
    const ministryRes = await fetch(MINISTRY_URL);
    const ministryData = await ministryRes.json();
    const stations: Record<string, string>[] = ministryData.ListaEESSPrecio;

    if (!stations?.length) {
      return res.status(500).json({ error: 'No stations from Ministry API' });
    }

    const today = new Date().toISOString().split('T')[0];

    // 2. Build rows to upsert
    const rows: { station_id: string; date: string; fuel_type: string; price: number }[] = [];

    for (const station of stations) {
      const stationId = station['IDEESS'];
      for (const [ministryKey, fuelCode] of Object.entries(FUEL_MAP)) {
        const raw = station[ministryKey]?.replace(',', '.');
        const price = parseFloat(raw);
        if (!isNaN(price) && price > 0) {
          rows.push({ station_id: stationId, date: today, fuel_type: fuelCode, price });
        }
      }
    }

    // 3. Upsert in batches of 500 to avoid payload limits
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/price_history`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(batch),
      });
      if (!upsertRes.ok) {
        const err = await upsertRes.text();
        console.error('Supabase upsert error:', err);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`[cron-prices] ${today}: ${inserted} rows upserted`);
    return res.status(200).json({ ok: true, date: today, rows: inserted });

  } catch (err) {
    console.error('[cron-prices] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
