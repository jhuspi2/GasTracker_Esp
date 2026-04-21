import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lat, lng, name } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const query = `[out:json][timeout:15];node(around:70,${lat},${lng})[amenity=fuel];out body;`;
    const osmResponse = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const elements = osmResponse.data.elements || [];

    let station = elements[0];
    if (elements.length > 1 && name) {
      const targetName = (name as string).toLowerCase();
      station = elements.find((e: any) =>
        e.tags?.name?.toLowerCase().includes(targetName) ||
        e.tags?.brand?.toLowerCase().includes(targetName)
      ) || elements[0];
    }

    if (!station?.tags) {
      return res.json({ services: {} });
    }

    const tags = station.tags;

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.json({
      services: {
        hasShop: tags.shop === 'convenience' || tags.shop === 'supermarket' || tags.shop === 'kiosk' || tags['fuel:shop'] === 'yes' || !!tags.shop,
        hasCarWash: tags.car_wash === 'yes' || tags['fuel:car_wash'] === 'yes' || tags.amenity === 'car_wash',
        hasCafe: tags.amenity === 'cafe' || tags.amenity === 'restaurant' || tags['fuel:cafe'] === 'yes' || tags['amenity:cafe'] === 'yes',
        hasAirWater: tags.compressed_air === 'yes' || tags.water === 'yes' || tags['fuel:compressed_air'] === 'yes',
      },
    });
  } catch (error: any) {
    console.error('OSM Proxy Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch from OpenStreetMap' });
  }
}
