/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GasStation } from '../types';

/**
 * OPENSTREETMAP (OSM) AMENITIES SERVICE
 * 
 * Fetches real services (shop, cafe, car wash) from OpenStreetMap
 * using our secure backend proxy.
 */

const CACHE_KEY = 'osm_services_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CachedServices {
  [stationId: string]: {
    services: Partial<GasStation>;
    timestamp: number;
  };
}

function getCache(): CachedServices {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveToCache(stationId: string, services: Partial<GasStation>) {
  try {
    const cache = getCache();
    cache[stationId] = {
      services,
      timestamp: Date.now()
    };
    
    // Clean old entries to keep cache small
    const now = Date.now();
    const cleanCache = Object.keys(cache).reduce((acc, id) => {
      if (now - cache[id].timestamp < CACHE_DURATION) {
        acc[id] = cache[id];
      }
      return acc;
    }, {} as CachedServices);

    localStorage.setItem(CACHE_KEY, JSON.stringify(cleanCache));
  } catch (e) {
    console.warn('Could not save to localStorage cache:', e);
  }
}

export async function fetchRealServicesFromOSM(station: GasStation): Promise<Partial<GasStation>> {
  // 1. Check Cache first
  const cache = getCache();
  const cachedEntry = cache[station.id];
  
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.services;
  }

  // 2. If not in cache or expired, fetch from server
  try {
    const response = await fetch(`/api/station/services?name=${encodeURIComponent(station.name)}&lat=${station.latitude}&lng=${station.longitude}`);
    
    if (!response.ok) {
      throw new Error('OSM Proxy error');
    }
    
    const data = await response.json();
    const services = data.services || {};
    
    // 3. Save to cache
    if (Object.keys(services).length > 0) {
      saveToCache(station.id, services);
    }
    
    return services;
  } catch (error) {
    console.error('Error fetching real services from OSM:', error);
    return {};
  }
}
