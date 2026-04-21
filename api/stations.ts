import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const GOV_API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await axios.get(GOV_API, {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.data?.ListaEESSPrecio) {
      throw new Error('Invalid data structure from Ministry API');
    }

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.json(response.data.ListaEESSPrecio);
  } catch (error: any) {
    console.error('Stations API Error:', error.message);
    return res.status(502).json({ error: 'Failed to fetch from Ministry API' });
  }
}
