/**
 * Reads real price history from Supabase.
 * Falls back to mock data if the station has no stored history yet.
 */

import { PriceHistory, FuelType } from '../types';
import { generateMockHistory } from './geminiService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getStationHistory(
  stationId: string,
  fuelType: FuelType,
  currentPrice: number,
  days = 30
): Promise<PriceHistory[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return generateMockHistory(currentPrice);
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const url = new URL(`${SUPABASE_URL}/rest/v1/price_history`);
    url.searchParams.set('station_id', `eq.${stationId}`);
    url.searchParams.set('fuel_type', `eq.${fuelType}`);
    url.searchParams.set('date', `gte.${sinceStr}`);
    url.searchParams.set('order', 'date.asc');
    url.searchParams.set('select', 'date,price');

    const res = await fetch(url.toString(), {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);

    const rows: { date: string; price: number }[] = await res.json();

    // If we have real data, use it; otherwise fall back to mock
    if (rows.length >= 3) {
      return rows.map(r => ({ date: r.date, price: Number(r.price) }));
    }

    return generateMockHistory(currentPrice);
  } catch (err) {
    console.warn('[historyService] falling back to mock:', err);
    return generateMockHistory(currentPrice);
  }
}
