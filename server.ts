import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use compression to speed up large JSON transfers to mobile
  app.use(compression());
  app.use(express.json());

  // Memory Cache for gas stations
  let stationCache: any = null;
  let lastFetchTimestamp: number = 0;
  const CACHE_TTL = 1000 * 60 * 30; // 30 mins

  const GOV_API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

  // Background Prefetcher: Keeps the server cache warm even if no users are active
  const prefetchData = async () => {
    try {
      console.log('🔄 background-warmup: Fetching data from Ministry API...');
      const response = await axios.get(GOV_API, {
        timeout: 30000,
        headers: { 'Accept': 'application/json' }
      });

      if (response.data && response.data.ListaEESSPrecio) {
        stationCache = response.data.ListaEESSPrecio;
        lastFetchTimestamp = Date.now();
        console.log(`✅ background-warmup: Cache updated with ${stationCache.length} stations.`);
      }
    } catch (error: any) {
      console.error('❌ background-warmup Error:', error.message);
    }
  };

  // Run on boot and then every 4 hours
  prefetchData();
  setInterval(prefetchData, 1000 * 60 * 60 * 4);

  app.get('/api/stations', async (req, res) => {
    try {
      // Check if we have valid cache
      if (stationCache && (Date.now() - lastFetchTimestamp < CACHE_TTL)) {
        return res.json(stationCache);
      }

      console.log('Fetching fresh data from Ministry API...');
      const response = await axios.get(GOV_API, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      });

      if (response.data && response.data.ListaEESSPrecio) {
        // Optimization: Pre-filter or clean data on server to reduce size
        // We only keep essential stations (with location and some basic identification)
        const rawData = response.data.ListaEESSPrecio;
        
        stationCache = rawData;
        lastFetchTimestamp = Date.now();
        return res.json(stationCache);
      }
      
      throw new Error('Invalid data structure from API');
    } catch (error: any) {
      console.error('Proxy Error:', error.message);
      // If error but we have stale cache, serve it
      if (stationCache) return res.json(stationCache);
      res.status(502).json({ error: 'Failed to fetch from Ministry API' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // OpenStreetMap (OSM) Overpass Proxy
  app.get('/api/station/services', async (req, res) => {
    const { lat, lng, name } = req.query;

    try {
      // Query OSM nodes tagged as 'amenity=fuel' within 70 meters of the coordinates
      const query = `[out:json][timeout:15];node(around:70,${lat},${lng})[amenity=fuel];out body;`;
      const osmResponse = await axios.post(
        'https://overpass-api.de/api/interpreter',
        `data=${encodeURIComponent(query)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const elements = osmResponse.data.elements || [];
      
      // If we find multiple, try to find the best match by name
      let station = elements[0];
      if (elements.length > 1 && name) {
        const targetName = (name as string).toLowerCase();
        station = elements.find((e: any) => 
          e.tags?.name?.toLowerCase().includes(targetName) || 
          e.tags?.brand?.toLowerCase().includes(targetName)
        ) || elements[0];
      }

      if (!station || !station.tags) {
        return res.json({ services: {} });
      }

      const tags = station.tags;
      
      // Map OSM tags to our service flags
      // OSM common tags for services:
      // shop=convenience, shop=supermarket, shop=kiosk
      // amenity:cafe, amenity:restaurant, fuel:cafe=yes
      // car_wash=yes
      // compressed_air=yes, water=yes
      res.json({
        services: {
          hasShop: tags.shop === 'convenience' || tags.shop === 'supermarket' || tags.shop === 'kiosk' || tags['fuel:shop'] === 'yes' || !!tags.shop,
          hasCarWash: tags.car_wash === 'yes' || tags['fuel:car_wash'] === 'yes' || tags.amenity === 'car_wash',
          hasCafe: tags.amenity === 'cafe' || tags.amenity === 'restaurant' || tags['fuel:cafe'] === 'yes' || tags['amenity:cafe'] === 'yes',
          hasAirWater: tags.compressed_air === 'yes' || tags.water === 'yes' || tags['fuel:compressed_air'] === 'yes',
        }
      });
    } catch (error: any) {
      console.error('OSM Proxy Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch from OpenStreetMap' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GAS-TRACKER Server running on http://localhost:${PORT}`);
    console.log(`📱 Optimization: Gzip Compression ENABLED`);
  });
}

startServer();
