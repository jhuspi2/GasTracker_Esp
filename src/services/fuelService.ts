/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GasStation, FuelType } from '../types';

const API_ENDPOINT = '/api/stations';

const FUEL_MAPPING: Record<string, FuelType> = {
  'Precio Gasolina 95 E5': 'G95E5',
  'Precio Gasolina 98 E5': 'G98E5',
  'Precio Gasoleo A': 'GOA',
  'Precio Gasoleo Premium': 'GPR',
  'Precio Gases licuados del petróleo': 'GLP',
  'Precio Gas natural licuado': 'GNL',
  'Precio Nuevo Gasoleo A': 'GOA',
};

const CACHE_KEY = 'fuel_prices_cache';
const CACHE_TIME = 1000 * 60 * 15; // Reduce local cache since server is already caching

export function getCachedStations(): GasStation[] {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached).data || [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function fetchGasStations(): Promise<GasStation[]> {
  try {
    // 1. Check Local Cache first (Instant load)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TIME) {
        return data;
      }
    }

    // 2. Fetch from our Proxy (Compressed and Server-Cached)
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) throw new Error('Proxy error');
    
    const stations = await response.json();

    const mappedStations = stations.map((s: any) => {
      const prices: Partial<Record<FuelType, number>> = {};
      
      Object.entries(FUEL_MAPPING).forEach(([key, fuelType]) => {
        const value = s[key];
        if (value) {
          prices[fuelType] = parseFloat(value.replace(',', '.'));
        }
      });

      // Self-service detection
      const isSelfService = s['Tipo Venta'] === 'P' || s['Rótulo']?.toLowerCase().includes('autoservicio') || s['Rótulo']?.toLowerCase().includes('ballenoil') || s['Rótulo']?.toLowerCase().includes('plenoil');

      // Mock services based on brand or random for demo
      const brand = s['Rótulo']?.toUpperCase() || '';
      const isMajorBrand = brand.includes('REPSOL') || brand.includes('CEPSA') || brand.includes('BP') || brand.includes('GALP') || brand.includes('SHELL');

      return {
        id: s.IDEESS,
        name: s['Rótulo'],
        address: s['Dirección'],
        city: s['Localidad'],
        province: s['Provincia'],
        latitude: parseFloat(s['Latitud'].replace(',', '.')),
        longitude: parseFloat(s['Longitud (WGS84)'].replace(',', '.')),
        prices,
        schedule: s['Horario'],
        brand: s['Rótulo'],
        isSelfService,
        isEnriched: false,
        hasShop: isMajorBrand || Math.random() > 0.5,
        hasCarWash: isMajorBrand ? Math.random() > 0.4 : Math.random() > 0.8,
        hasAirWater: Math.random() > 0.3,
        hasCafe: isMajorBrand ? Math.random() > 0.6 : Math.random() > 0.9,
      };
    });

    // 2. Update Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: mappedStations
    }));

    return mappedStations;
  } catch (error) {
    console.error('Error fetching data:', error);
    // Fallback to cache if error
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached).data;
    }
    return [];
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
